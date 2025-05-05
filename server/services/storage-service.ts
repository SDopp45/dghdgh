import { db } from "../db";
import { eq } from "drizzle-orm";
import { users, documents, storageTransactions } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

// Définitions des limites de stockage en octets
export const STORAGE_TIERS = {
  basic: 5 * 1024 * 1024 * 1024, // 5GB
  tier1: 10 * 1024 * 1024 * 1024, // 10GB
  tier2: 20 * 1024 * 1024 * 1024, // 20GB
  tier3: 50 * 1024 * 1024 * 1024, // 50GB
  tier4: 100 * 1024 * 1024 * 1024, // 100GB
};

// Prix des forfaits de stockage (en €)
export const STORAGE_PRICES = {
  tier1: 4.99,  // 10GB: 4.99€
  tier2: 9.99,  // 20GB: 9.99€
  tier3: 19.99, // 50GB: 19.99€
  tier4: 39.99, // 100GB: 39.99€
};

/**
 * Récupérer l'utilisation de stockage d'un utilisateur
 */
export async function getUserStorageInfo(userId: number) {
  try {
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      storageUsed: users.storageUsed,
      storageLimit: users.storageLimit,
      storageTier: users.storageTier,
    }).from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Calculer le pourcentage d'utilisation
    const usedBytes = parseFloat(user.storageUsed);
    const limitBytes = parseFloat(user.storageLimit);
    const usagePercentage = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;

    // Information sur le prochain niveau
    const nextTier = getNextTier(user.storageTier);
    const nextTierInfo = nextTier ? {
      tier: nextTier,
      limit: STORAGE_TIERS[nextTier],
      price: STORAGE_PRICES[nextTier]
    } : null;

    return {
      userId: user.id,
      username: user.username,
      storageUsed: usedBytes,
      storageLimit: limitBytes,
      storageTier: user.storageTier,
      usagePercentage: parseFloat(usagePercentage.toFixed(2)),
      formattedUsed: formatBytes(usedBytes),
      formattedLimit: formatBytes(limitBytes),
      nextTier: nextTierInfo,
      hasReachedLimit: usedBytes >= limitBytes,
    };
  } catch (error) {
    logger.error(`Error getting user storage info (userId: ${userId}):`, error);
    throw error;
  }
}

/**
 * Vérifier si l'utilisateur a assez d'espace de stockage pour un téléchargement
 */
export async function hasEnoughStorage(userId: number, fileSize: number): Promise<boolean> {
  try {
    const storageInfo = await getUserStorageInfo(userId);
    return (storageInfo.storageUsed + fileSize) <= storageInfo.storageLimit;
  } catch (error) {
    logger.error(`Error checking storage availability (userId: ${userId}):`, error);
    throw error;
  }
}

/**
 * Mettre à jour l'espace de stockage utilisé après un téléchargement
 */
export async function updateStorageUsed(userId: number, addedSize: number): Promise<void> {
  try {
    const [user] = await db.select({
      storageUsed: users.storageUsed,
    }).from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const currentStorageUsed = parseFloat(user.storageUsed);
    const newStorageUsed = currentStorageUsed + addedSize;

    await db.update(users)
      .set({ 
        storageUsed: newStorageUsed.toString(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    logger.info(`Updated storage used for user ${userId}: ${currentStorageUsed} -> ${newStorageUsed} bytes`);
  } catch (error) {
    logger.error(`Error updating storage used (userId: ${userId}):`, error);
    throw error;
  }
}

/**
 * Mettre à jour le niveau de stockage d'un utilisateur
 */
export async function upgradeStorageTier(
  userId: number, 
  newTier: keyof typeof STORAGE_TIERS,
  amountPaid: number,
  paymentMethod?: string,
  paymentReference?: string,
): Promise<void> {
  try {
    const [user] = await db.select({
      storageTier: users.storageTier,
    }).from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Vérifier que le nouveau niveau est valide
    if (!STORAGE_TIERS[newTier]) {
      throw new Error(`Invalid storage tier: ${newTier}`);
    }

    // Vérifier que c'est une mise à niveau (pas une rétrogradation)
    const tierLevels = Object.keys(STORAGE_TIERS);
    const currentTierIndex = tierLevels.indexOf(user.storageTier);
    const newTierIndex = tierLevels.indexOf(newTier);

    if (newTierIndex <= currentTierIndex) {
      throw new Error(`Cannot downgrade storage tier from ${user.storageTier} to ${newTier}`);
    }

    // Mettre à jour le niveau de stockage
    await db.update(users)
      .set({ 
        storageTier: newTier,
        storageLimit: STORAGE_TIERS[newTier].toString(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Enregistrer la transaction
    await db.insert(storageTransactions)
      .values({
        userId,
        previousTier: user.storageTier,
        newTier,
        amountPaid: amountPaid.toString(),
        transactionDate: new Date(),
        paymentMethod,
        paymentReference,
        status: "completed",
        notes: `Upgrade from ${user.storageTier} to ${newTier}`
      });

    logger.info(`Upgraded storage tier for user ${userId}: ${user.storageTier} -> ${newTier}`);
  } catch (error) {
    logger.error(`Error upgrading storage tier (userId: ${userId}):`, error);
    throw error;
  }
}

/**
 * Obtenir le prochain niveau de stockage
 */
function getNextTier(currentTier: string): keyof typeof STORAGE_TIERS | null {
  const tiers = Object.keys(STORAGE_TIERS) as Array<keyof typeof STORAGE_TIERS>;
  const currentIndex = tiers.indexOf(currentTier as keyof typeof STORAGE_TIERS);
  
  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null; // Niveau actuel invalide ou niveau maximum atteint
  }
  
  return tiers[currentIndex + 1];
}

/**
 * Formater les octets en une chaîne lisible (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calculer la taille totale du stockage utilisé par un utilisateur
 * et mettre à jour la base de données
 */
export async function recalculateUserStorage(userId: number): Promise<void> {
  try {
    const userDocuments = await db.select({
      id: documents.id,
      filePath: documents.filePath,
    }).from(documents)
      .where(eq(documents.userId, userId));

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const documentsDir = path.resolve(uploadsDir, 'documents');
    
    let totalSize = 0;

    // Calculer la taille des documents
    for (const doc of userDocuments) {
      try {
        const filePath = path.join(documentsDir, doc.filePath);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      } catch (err) {
        logger.warn(`Error calculating size for document ${doc.id}:`, err);
        // Continue avec le document suivant
      }
    }

    // Mettre à jour la base de données
    await db.update(users)
      .set({ 
        storageUsed: totalSize.toString(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    logger.info(`Recalculated storage for user ${userId}: ${totalSize} bytes`);
  } catch (error) {
    logger.error(`Error recalculating user storage (userId: ${userId}):`, error);
    throw error;
  }
} 