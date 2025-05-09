import { Router } from 'express';
import multer from 'multer';
import { ensureAuth, isAdmin, adminOnly, getUserId } from '../middleware/auth';
import { db } from '@db';
import { stringify } from 'csv-stringify';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import logger from '../utils/logger';
import { properties, tenants, visits, maintenanceRequests, transactions, documents } from '@shared/schema';
import { and, eq, gte, lte, like, sql } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const router = Router();

// Configuration Multer pour les uploads CSV
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv') {
      cb(new Error('Seuls les fichiers CSV sont acceptés'));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite à 5MB
  }
});

// Export CSV - Admin only
router.get('/export/csv', ensureAuth, isAdmin, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { type, search, date_start, date_end, status } = req.query;

    if (!type || !['properties', 'tenants', 'visits', 'transactions', 'maintenance'].includes(type as string)) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'Type de données invalide' });
    }

    let data;
    const dateFilter = date_start ? {
      createdAt: and(
        date_start ? gte(properties.createdAt, new Date(date_start as string)) : undefined,
        date_end ? lte(properties.createdAt, new Date(date_end as string)) : undefined
      )
    } : {};

    const conditions: any[] = Object.values(dateFilter).filter(Boolean);
    if (search) {
      // Ajouter une condition de recherche si nécessaire
      // Mise en œuvre à adapter selon le modèle de données
    }

    switch(type) {
      case 'transactions':
        // Construire la requête avec filtres
        const transactionQuery: any = {
          with: {
            property: true
          }
        };
        
        // Filtrer par statut si spécifié
        if (status && status !== 'all') {
          transactionQuery.where = eq(transactions.status, status as string);
        }
        
        // Ajouter d'autres filtres si nécessaire (type, catégorie, etc.)
        if (req.query.type && req.query.type !== 'all') {
          const transactionType = req.query.type as string;
          if (!transactionQuery.where) {
            if (transactionType === 'income' || transactionType === 'expense' || transactionType === 'credit') {
              transactionQuery.where = eq(transactions.type, transactionType);
            }
          } else {
            if (transactionType === 'income' || transactionType === 'expense' || transactionType === 'credit') {
              transactionQuery.where = and(
                transactionQuery.where,
                eq(transactions.type, transactionType)
              );
            }
          }
        }
        
        if (req.query.category && req.query.category !== 'all') {
          if (!transactionQuery.where) {
            transactionQuery.where = eq(transactions.category, req.query.category as string);
          } else {
            transactionQuery.where = and(
              transactionQuery.where,
              eq(transactions.category, req.query.category as string)
            );
          }
        }
        
        if (req.query.paymentMethod && req.query.paymentMethod !== 'all') {
          const paymentMethod = req.query.paymentMethod as string;
          if (!transactionQuery.where) {
            transactionQuery.where = eq(transactions.paymentMethod, paymentMethod);
          } else {
            transactionQuery.where = and(
              transactionQuery.where,
              eq(transactions.paymentMethod, paymentMethod)
            );
          }
        }
        
        if (search) {
          const searchTerm = `%${search}%`;
          if (!transactionQuery.where) {
            transactionQuery.where = like(transactions.description, searchTerm);
          } else {
            transactionQuery.where = and(
              transactionQuery.where,
              like(transactions.description, searchTerm)
            );
          }
        }
        
        data = await db.query.transactions.findMany(transactionQuery);
        
        // Transform data for CSV format
        data = data.map(transaction => ({
          'Date': format(new Date(transaction.date), 'dd/MM/yyyy'),
          'Propriété': transaction.property?.name || 'N/A',
          'Description': transaction.description || '',
          'Catégorie': transaction.category || 'N/A',
          'Type': transaction.type === 'income' ? 'Revenu' : transaction.type === 'expense' ? 'Dépense' : 'Crédit',
          'Montant': `${transaction.amount} €`,
          'Méthode': transaction.paymentMethod || 'N/A',
          'Statut': transaction.status
        }));
        break;

      case 'maintenance':
        data = await db.query.maintenanceRequests.findMany({
          with: {
            property: true
          }
        });
        // Transform data for CSV format
        data = data.map(request => ({
          'Date': format(new Date(request.createdAt), 'dd/MM/yyyy'),
          'Propriété': request.property?.name || 'N/A',
          'Problème': request.title,
          'Statut': request.status === 'open' ? 'Ouvert' : request.status === 'in_progress' ? 'En cours' : 'Terminé',
          'Coût': request.totalCost ? `${request.totalCost} €` : 'N/A'
        }));
        break;

      case 'properties':
        data = await db.select().from(properties)
          .where(and(...conditions));
        break;
      case 'tenants':
        data = await db.select().from(tenants)
          .where(and(...conditions));
        break;
      case 'visits':
        data = await db.select().from(visits)
          .where(and(...conditions));
        break;
    }

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Aucune donnée trouvée' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-${Date.now()}.csv`);

    const stringifier = stringify({ 
      header: true,
      columns: Object.keys(data[0]),
      delimiter: ';' // Use semicolon for better Excel compatibility
    });

    stringifier.pipe(res);
    data.forEach(row => stringifier.write(row));
    stringifier.end();

  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Erreur lors de l\'export CSV:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'export des données' });
  }
});

// Import CSV - Admin only
router.post('/import/csv', ensureAuth, isAdmin, upload.single('file'), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    if (!req.file) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'Aucun fichier CSV fourni' });
    }

    const { type } = req.body;
    if (!type || !['properties', 'tenants', 'visits', 'transactions', 'maintenance'].includes(type)) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'Type de données invalide' });
    }

    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath, 'utf-8');
    const rows = fileData.split('\n').map(row => row.split(';')); // Using semicolon as delimiter
    const headers = rows[0];
    const dataRows = rows.slice(1);

    try {
      switch(type) {
        case 'transactions':
          // Parse and validate transactions data
          for (const row of dataRows) {
            if (row.length >= 8) {
              const [dateStr, property, description, category, transactionType, amount, method, status] = row;
              const [day, month, year] = dateStr.split('/').map(Number);

              await db.insert(transactions).values({
                userId,
                date: new Date(year, month - 1, day),
                propertyId: await getPropertyIdByName(property, clientSchema),
                description: description,
                category: category,
                type: transactionType as 'income' | 'expense' | 'credit',
                amount: parseFloat(amount),
                paymentMethod: method,
                status: status,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
          break;

        case 'maintenance':
          // Parse and validate maintenance data
          for (const row of dataRows) {
            if (row.length >= 5) {
              const [dateStr, property, problem, status, cost] = row;
              const [day, month, year] = dateStr.split('/').map(Number);

              await db.insert(maintenanceRequests).values({
                userId,
                title: problem,
                description: '',
                status: status,
                priority: 'medium',
                propertyId: await getPropertyIdByName(property, clientSchema),
                totalCost: parseFloat(cost),
                createdAt: new Date(year, month - 1, day),
                updatedAt: new Date()
              });
            }
          }
          break;

        case 'properties':
          // Implement property import logic
          break;
        case 'tenants':
          // Implement tenant import logic
          break;
        case 'visits':
          // Implement visit import logic
          break;
      }

      // Réinitialiser le search_path après utilisation
      await db.execute(sql`SET search_path TO public`);
      
      fs.unlinkSync(filePath);
      res.json({ message: 'Import réussi' });
    } catch (error) {
      // Réinitialiser le search_path en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(() => {});
      logger.error('Erreur lors du traitement des données:', error);
      throw new AppError('Erreur lors du traitement des données CSV', 400);
    }
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Erreur lors de l\'import CSV:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'import des données' });
  }
});

// Helper function to get property ID by name
async function getPropertyIdByName(propertyName: string, schemaName?: string): Promise<number> {
  if (schemaName) {
    await db.execute(sql`SET search_path TO ${sql.identifier(schemaName)}, public`);
  }
  
  try {
    const property = await db.query.properties.findFirst({
      where: eq(properties.name, propertyName)
    });

    if (!property) {
      throw new Error(`Propriété non trouvée : ${propertyName}`);
    }

    return property.id;
  } finally {
    if (schemaName) {
      await db.execute(sql`SET search_path TO public`).catch(() => {});
    }
  }
}

// Export PDF - Available to all authenticated users
router.get('/export/pdf', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { type, id } = req.query;
    logger.info(`Début de l'export PDF pour ${type} ${id}`);

    if (!type || !['properties', 'tenants', 'visits', 'transactions'].includes(type as string)) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'Type de données invalide' });
    }

    if (!id) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'ID requis' });
    }

    const numericId = parseInt(id as string);
    if (isNaN(numericId)) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'ID invalide' });
    }

    try {
      let data;
      switch(type) {
        case 'properties':
          data = await db.query.properties.findFirst({
            where: eq(properties.id, numericId)
          });
          break;
        case 'tenants':
          data = await db.query.tenants.findFirst({
            where: eq(tenants.id, numericId),
            with: {
              user: true
            }
          });
          break;
        case 'visits':
          data = await db.query.visits.findFirst({
            where: eq(visits.id, numericId)
          });
          break;
        case 'transactions':
          data = await db.query.transactions.findFirst({
            where: eq(transactions.id, numericId)
          });
          break;
      }

      // Réinitialiser le search_path après utilisation
      await db.execute(sql`SET search_path TO public`);

      if (!data) {
        return res.status(404).json({ error: 'Données non trouvées' });
      }

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 portrait
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const drawText = (text: string, x: number, y: number, size: number = 12, isBold: boolean = false) => {
        page.drawText(text, {
          x,
          y,
          size,
          font: isBold ? boldFont : font,
          color: rgb(0.1, 0.1, 0.1)
        });
      };

      const drawSeparator = (y: number) => {
        page.drawLine({
          start: { x: 50, y },
          end: { x: width - 50, y },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });
      };

      switch(type) {
        case 'properties': {
          if (!('name' in data)) break;
          
          // En-tête
          drawText(data.name, 50, height - 50, 24, true);
          drawText(`Référence: ${data.id}`, 50, height - 80, 14);
          drawText(`Statut: ${data.status}`, 50, height - 100, 14);

          let y = height - 140;
          drawText('Caractéristiques', 50, y, 18, true);
          y -= 30;

          const mainInfo = [
            `Surface habitable: ${data.livingArea} m²`,
            `Surface terrain: ${data.landArea} m²`,
            `Surface totale: ${data.area} m²`,
            `Nombre d'unités: ${data.units}`,
            `Nombre de pièces: ${data.rooms}`,
            `Chambres: ${data.bedrooms}`,
            `Salles de bain: ${data.bathrooms}`,
            `WC: ${data.toilets}`,
            `Étages: ${data.floors}`,
            `Année de construction: ${data.constructionYear}`,
            `Classe énergétique: ${data.energyClass}`
          ];

          mainInfo.forEach(info => {
            drawText(info, 50, y, 12);
            y -= 25;
          });

          // Équipements
          y -= 20;
          drawSeparator(y);
          y -= 30;
          drawText('Équipements', 50, y, 18, true);
          y -= 30;

          const features = [
            data.hasParking && '- Parking',
            data.hasGarage && '- Garage',
            data.hasTerrace && '- Terrasse',
            data.hasDependency && '- Dépendance'
          ].filter(Boolean);

          features.forEach(feature => {
            drawText(feature as string, 50, y, 12);
            y -= 25;
          });

          // Informations financières
          y -= 20;
          drawSeparator(y);
          y -= 30;
          drawText('Informations financières', 50, y, 18, true);
          y -= 30;

          const financialInfo = [
            `Prix d'achat: ${data.purchasePrice?.toLocaleString() || 0} €`,
            `Montant du crédit: ${data.loanAmount?.toLocaleString() || 0} €`,
            `Mensualité du crédit: ${data.monthlyLoanPayment?.toLocaleString() || 0} €`
          ];

          financialInfo.forEach(info => {
            drawText(info, 50, y, 12);
            y -= 25;
          });

          // Description
          if (data.description) {
            y -= 20;
            drawSeparator(y);
            y -= 30;
            drawText('Description', 50, y, 18, true);
            y -= 30;

            const maxWidth = width - 100;
            const words = data.description.split(' ');
            let line = '';

            for (const word of words) {
              const testLine = line + (line ? ' ' : '') + word;
              const textWidth = font.widthOfTextAtSize(testLine, 12);

              if (textWidth > maxWidth) {
                drawText(line, 50, y, 12);
                line = word;
                y -= 20;
              } else {
                line = testLine;
              }
            }
            if (line) {
              drawText(line, 50, y, 12);
            }
          }
          break;
        }

        case 'tenants': {
          if (!('leaseType' in data)) break;
          
          // En-tête
          drawText(`Fiche Locataire`, 50, height - 50, 24, true);
          drawText(`Référence: ${data.id}`, 50, height - 80, 14);

          let y = height - 120;
          drawText('Informations personnelles', 50, y, 18, true);
          y -= 30;

          const personalInfo = [
            `Nom complet: ${data.user?.fullName || 'N/A'}`,
            `Email: ${data.user?.email || 'N/A'}`,
            `Téléphone: ${data.user?.phoneNumber || 'N/A'}`
          ];

          personalInfo.forEach(info => {
            drawText(info, 50, y, 12);
            y -= 25;
          });

          // Informations du bail
          y -= 20;
          drawSeparator(y);
          y -= 30;
          drawText('Informations du bail', 50, y, 18, true);
          y -= 30;

          const leaseInfo = [
            `Type de bail: ${data.leaseType}`,
            `Début du bail: ${new Date(data.leaseStart).toLocaleDateString('fr-FR')}`,
            `Fin du bail: ${new Date(data.leaseEnd).toLocaleDateString('fr-FR')}`,
            `Loyer mensuel: ${data.rentAmount?.toLocaleString() || 0} €`,
            `Statut: ${data.leaseStatus}`
          ];

          leaseInfo.forEach(info => {
            drawText(info, 50, y, 12);
            y -= 25;
          });
          break;
        }

        case 'visits': {
          if (!('firstName' in data)) break;
          
          // En-tête
          drawText(`Fiche de visite`, 50, height - 50, 24, true);
          drawText(`Référence: ${data.id}`, 50, height - 80, 14);

          let y = height - 120;
          drawText('Informations de la visite', 50, y, 18, true);
          y -= 30;

          const visitInfo = [
            `Date: ${new Date(data.datetime).toLocaleDateString('fr-FR')}`,
            `Statut: ${data.status}`,
            `Visiteur: ${data.firstName} ${data.lastName}`,
            `Email: ${data.email}`,
            `Téléphone: ${data.phone}`
          ];

          visitInfo.forEach(info => {
            drawText(info, 50, y, 12);
            y -= 25;
          });

          if (data.message) {
            y -= 20;
            drawSeparator(y);
            y -= 30;
            drawText('Message', 50, y, 18, true);
            y -= 30;

            const maxWidth = width - 100;
            const words = data.message.split(' ');
            let line = '';

            for (const word of words) {
              const testLine = line + (line ? ' ' : '') + word;
              const textWidth = font.widthOfTextAtSize(testLine, 12);

              if (textWidth > maxWidth) {
                drawText(line, 50, y, 12);
                line = word;
                y -= 20;
              } else {
                line = testLine;
              }
            }
            if (line) {
              drawText(line, 50, y, 12);
            }
          }
          break;
        }

        case 'transactions': {
          // En-tête
          drawText(`Fiche de transaction`, 50, height - 50, 24, true);
          drawText(`Référence: ${data.id}`, 50, height - 80, 14);

          let y = height - 120;
          drawText('Détails de la transaction', 50, y, 18, true);
          y -= 30;

          const transactionInfo = [
            `Date: ${new Date(data.date).toLocaleDateString('fr-FR')}`,
            `Type: ${data.type}`,
            `Montant: ${data.amount?.toLocaleString() || 0} €`,
            `Statut: ${data.status}`,
            `Catégorie: ${data.category || 'N/A'}`,
            `Méthode de paiement: ${data.paymentMethod || 'N/A'}`
          ];

          transactionInfo.forEach(info => {
            drawText(info, 50, y, 12);
            y -= 25;
          });

          if (data.description) {
            y -= 20;
            drawSeparator(y);
            y -= 30;
            drawText('Description', 50, y, 18, true);
            y -= 30;

            const maxWidth = width - 100;
            const words = data.description.split(' ');
            let line = '';

            for (const word of words) {
              const testLine = line + (line ? ' ' : '') + word;
              const textWidth = font.widthOfTextAtSize(testLine, 12);

              if (textWidth > maxWidth) {
                drawText(line, 50, y, 12);
                line = word;
                y -= 20;
              } else {
                line = testLine;
              }
            }
            if (line) {
              drawText(line, 50, y, 12);
            }
          }
          break;
        }
      }

      // Pied de page
      drawSeparator(50);
      drawText(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, 50, 30, 10);

      const pdfBytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-${id}-${Date.now()}.pdf`);
      res.send(Buffer.from(pdfBytes));

    } catch (error) {
      // Réinitialiser le search_path en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(() => {});
      logger.error('Erreur lors de la génération du PDF:', error);
      throw new AppError('Erreur lors de la génération du PDF', 500);
    }

  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Erreur lors de l\'export PDF:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({ error: error instanceof Error ? error.message : 'Erreur lors de l\'export PDF' });
  }
});

export default router;