/**
 * Utilitaires pour la gestion des locataires
 */
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from './logger';
import { formatDate as standardFormatDate } from './date-utils';
import { db } from "@db";
import { transactions, feedbackHistory, tenants, users } from "@shared/schema";
import { eq, and, not, isNull, like, gte, lte, or, sql } from "drizzle-orm";
import { addMonths, differenceInMonths } from "date-fns";
import { AppError } from "../middleware/errorHandler";
import { TRANSACTION_STATUS } from '../constants/transaction-status';
import { TRANSACTION_CATEGORIES } from '../constants/transaction-categories';

/**
 * Calcule la note moyenne à partir d'un tableau de notations
 * @param ratings Tableau d'objets contenant une propriété 'rating'
 * @param defaultValue Valeur par défaut si aucune notation valide n'est trouvée (null par défaut)
 * @returns La moyenne arrondie à une décimale ou la valeur par défaut
 */
export function calculateAverageRating(ratings: any[], defaultValue: number | null = null): number | null {
  if (!ratings || ratings.length === 0) return defaultValue;
  
  // Filtrer les notes nulles, undefined ou <= 0 (notes invalides)
  const validRatings = ratings.filter(r => r.rating !== null && r.rating !== undefined && r.rating > 0);
  
  if (validRatings.length === 0) return defaultValue;
  
  const sum = validRatings.reduce((acc, curr) => acc + Number(curr.rating), 0);
  // Arrondir à une décimale avec toFixed puis reconvertir en nombre
  return Number((sum / validRatings.length).toFixed(1));
}

/**
 * Formate une date au format français
 * @deprecated Utiliser standardFormatDate de './date-utils' à la place
 */
export function formatDate(date: Date | string): string {
  return standardFormatDate(date, 'long');
}

/**
 * Convertit les montants de chaîne de caractères en nombre
 * Utile pour les opérations mathématiques et les tris
 */
export function parseAmount(amount: string | number | null): number {
  if (amount === null || amount === undefined) return 0;
  if (typeof amount === 'number') return amount;
  
  try {
    // Supprimer tout caractère non numérique sauf le point décimal
    const cleanedAmount = amount.replace(/[^\d.]/g, '');
    return parseFloat(cleanedAmount) || 0;
  } catch (error) {
    logger.error('Error parsing amount:', error);
    return 0;
  }
}

/**
 * Formate un montant en euros
 */
export function formatAmount(amount: string | number | null): string {
  const value = parseAmount(amount);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

/**
 * Génère un username unique basé sur le nom complet
 */
export async function generateUniqueUsername(
  baseName: string,
  checkExistingFn?: (username: string) => Promise<boolean>
): Promise<string> {
  // Nettoyer le nom pour un format de username
  let username = baseName
    .toLowerCase()
    .normalize('NFD')                   // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '')    // Supprimer les accents
    .replace(/[^a-z0-9]/g, '');         // Garder uniquement les lettres et chiffres
  
  let counter = 1;
  let isUnique = false;
  let candidateUsername = username;
  
  // Vérifier et ajuster jusqu'à trouver un username unique
  while (!isUnique) {
    if (checkExistingFn) {
      const exists = await checkExistingFn(candidateUsername);
      if (!exists) {
        isUnique = true;
      } else {
        candidateUsername = `${username}${counter}`;
        counter++;
      }
    } else {
      // Vérification par défaut avec la base de données
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, candidateUsername)
      });
      
      if (!existingUser) {
        isUnique = true;
      } else {
        candidateUsername = `${username}${counter}`;
        counter++;
      }
    }
  }
  
  return candidateUsername;
}

/**
 * Génère les transactions de loyer pour un locataire
 */
export async function generateRentTransactions(
  userId: number,
  propertyId: number,
  tenantId: number,
  leaseStart: Date,
  leaseEnd: Date,
  rentAmount: string
) {
  try {
    logger.info(`Starting rent transactions generation - propertyId: ${propertyId}, tenantId: ${tenantId}`);
    logger.info(`Lease period: ${leaseStart.toISOString()} to ${leaseEnd.toISOString()}`);
    logger.info(`Rent amount: ${rentAmount}`);

    const transactions_to_create = [];
    const numberOfMonths = differenceInMonths(leaseEnd, leaseStart);

    logger.info(`Will generate ${numberOfMonths + 1} transactions`);

    for (let i = 0; i <= numberOfMonths; i++) {
      const transactionDate = addMonths(leaseStart, i);
      // Ne pas créer de transaction si la date dépasse la fin du bail
      if (transactionDate > leaseEnd) break;

      const transaction = {
        userId,
        propertyId,
        tenantId,  // Cela utilisera la colonne tenant_id de la table transactions
        type: "income" as const,
        category: TRANSACTION_CATEGORIES.RENT,
        amount: rentAmount,
        description: `Loyer du ${format(transactionDate, 'dd/MM/yyyy')}`,
        date: transactionDate,
        status: TRANSACTION_STATUS.PENDING,
        paymentMethod: "bank_transfer" as const
      };

      logger.info(`Creating transaction for date: ${transactionDate.toISOString()}`, transaction);
      transactions_to_create.push(transaction);
    }

    if (transactions_to_create.length > 0) {
      logger.info(`Inserting ${transactions_to_create.length} rent transactions`);

      try {
        const insertedTransactions = await db
          .insert(transactions)
          .values(transactions_to_create)
          .returning();

        logger.info(`Successfully created ${insertedTransactions.length} rent transactions:`,
          insertedTransactions.map(t => ({
            id: t.id,
            date: t.date,
            amount: t.amount
          }))
        );

        return insertedTransactions;
      } catch (error) {
        logger.error("Error inserting transactions:", error);
        // Si l'erreur est due à un problème de colonne tenant_id, ajouter une info de débogage
        if (error.message && error.message.includes("tenant_id")) {
          logger.error("Column tenant_id appears to be missing or invalid. Check database schema.");
        }
        throw error;
      }
    }

    logger.info('No transactions were created - check date range and other parameters');
    return [];
  } catch (error) {
    logger.error("Error generating rent transactions:", error);
    throw new AppError("Erreur lors de la création des transactions de loyer", 500);
  }
}

/**
 * Gère les transactions lors de l'archivage ou de la suppression d'un locataire
 */
export async function handleTransactions(tenantId: number, action: 'cancel' | 'delete') {
  try {
    if (action === 'cancel') {
      // Mettre à jour le statut des transactions en "cancelled"
      await db.update(transactions)
        .set({ status: 'cancelled' })
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.status, 'pending')
        ));
      logger.info(`Marked pending transactions as cancelled for tenant ${tenantId}`);
    } else if (action === 'delete') {
      // Supprimer les transactions en attente
      await db.delete(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.status, 'pending')
        ));
      logger.info(`Deleted pending transactions for tenant ${tenantId}`);
    }
  } catch (error) {
    logger.error(`Error handling transactions for tenant ${tenantId}:`, error);
    throw new AppError("Erreur lors du traitement des transactions", 500);
  }
}

/**
 * Trouve les feedbacks orphelins pour un nom de locataire
 */
export async function findOrphanedFeedbacks(fullName: string) {
  try {
    return await db.query.feedbackHistory.findMany({
      where: and(
        isNull(feedbackHistory.tenantId),
        eq(feedbackHistory.tenantFullName, fullName),
        eq(feedbackHistory.isOrphaned, true)
      )
    });
  } catch (error) {
    logger.error(`Error finding orphaned feedbacks for ${fullName}:`, error);
    return [];
  }
}

/**
 * Construit les conditions de filtrage pour la pagination des locataires
 */
export function buildTenantFilterConditions(filters: any) {
  const conditions = [];
  
  if (filters.fullName) {
    conditions.push(like(sql`users.full_name`, `%${filters.fullName}%`));
  }
  
  if (filters.propertyId) {
    conditions.push(eq(tenants.propertyId, filters.propertyId));
  }
  
  if (filters.leaseType) {
    if (Array.isArray(filters.leaseType)) {
      const leaseTypeConditions = filters.leaseType.map((type: string) => 
        eq(tenants.leaseType as any, type)
      );
      if (leaseTypeConditions.length > 0) {
        conditions.push(or(...leaseTypeConditions));
      }
    } else {
      conditions.push(eq(tenants.leaseType as any, filters.leaseType));
    }
  }
  
  if (filters.leaseEndRange) {
    if (filters.leaseEndRange.from) {
      conditions.push(gte(tenants.leaseEnd, filters.leaseEndRange.from));
    }
    if (filters.leaseEndRange.to) {
      conditions.push(lte(tenants.leaseEnd, filters.leaseEndRange.to));
    }
  }
  
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      const activeConditions = filters.status.includes('active') 
        ? eq(tenants.active, true)
        : null;
      const archivedConditions = filters.status.includes('archived')
        ? eq(tenants.active, false)
        : null;
      
      if (activeConditions && archivedConditions) {
        // Ne rien ajouter, car on veut tout
      } else if (activeConditions) {
        conditions.push(activeConditions);
      } else if (archivedConditions) {
        conditions.push(archivedConditions);
      }
    } else if (filters.status === 'active') {
      conditions.push(eq(tenants.active, true));
    } else if (filters.status === 'archived') {
      conditions.push(eq(tenants.active, false));
    }
  }
  
  return conditions;
} 