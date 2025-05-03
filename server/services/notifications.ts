
import { db } from '../db';
import { notifications } from '../../db/schema';
import logger from '../utils/logger';

interface NotificationData {
  userId: number;
  title: string;
  message: string;
  type: string;
  relatedTo?: string;
  relatedId?: number;
}

export const createNotification = async (data: NotificationData) => {
  try {
    const result = await db.insert(notifications).values({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      relatedTo: data.relatedTo,
      relatedId: data.relatedId,
      createdAt: new Date()
    }).returning();
    
    logger.info(`Notification created: ${JSON.stringify(result[0])}`);
    return result[0];
  } catch (error) {
    logger.error(`Error creating notification: ${error}`);
    throw error;
  }
};

// Création de notifications automatiques basées sur des événements
export const createLeaseEndingNotification = async (userId: number, tenantId: number, tenantName: string, daysRemaining: number) => {
  return createNotification({
    userId,
    title: 'Fin de bail imminente',
    message: `Le bail de ${tenantName} se termine dans ${daysRemaining} jours.`,
    type: 'warning',
    relatedTo: 'tenant',
    relatedId: tenantId
  });
};

export const createMaintenanceNotification = async (userId: number, maintenanceId: number, propertyName: string, urgency: string) => {
  return createNotification({
    userId,
    title: 'Nouvelle demande de maintenance',
    message: `Une demande de maintenance ${urgency.toLowerCase()} a été créée pour la propriété "${propertyName}".`,
    type: urgency === 'URGENT' ? 'alert' : 'info',
    relatedTo: 'maintenance',
    relatedId: maintenanceId
  });
};

export const createRentDueNotification = async (userId: number, propertyId: number, propertyName: string) => {
  return createNotification({
    userId,
    title: 'Loyer à percevoir',
    message: `Il est temps de percevoir le loyer pour la propriété "${propertyName}".`,
    type: 'info',
    relatedTo: 'property',
    relatedId: propertyId
  });
};
