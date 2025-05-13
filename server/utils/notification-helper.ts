import { db } from '../db';
import { notifications, type InsertNotification } from '@shared/schema';
import logger from './logger';

export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  relatedTo,
  relatedId
}: Omit<InsertNotification, 'isRead'>) {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        title,
        message,
        type,
        relatedTo,
        relatedId,
        isRead: false
      })
      .returning();

    logger.info(`Created notification: ${notification.id}`);
    
    // La notification en temps réel via WebSocket a été supprimée
    
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

// Fonction utilitaire pour créer différents types de notifications
export const notificationFactory = {
  maintenance: {
    created: (userId: number, maintenanceId: number, propertyName: string) => 
      createNotification({
        userId,
        title: 'Nouvelle demande de maintenance',
        message: `Une nouvelle demande de maintenance a été créée pour la propriété ${propertyName}`,
        type: 'info',
        relatedTo: 'maintenance',
        relatedId: maintenanceId
      }),
    
    statusUpdated: (userId: number, maintenanceId: number, status: string) =>
      createNotification({
        userId,
        title: 'Statut de maintenance mis à jour',
        message: `Le statut de la demande de maintenance a été mis à jour : ${status}`,
        type: 'info',
        relatedTo: 'maintenance',
        relatedId: maintenanceId
      }),
    
    urgent: (userId: number, maintenanceId: number, propertyName: string) =>
      createNotification({
        userId,
        title: 'Maintenance urgente requise',
        message: `Une maintenance urgente est requise pour la propriété ${propertyName}`,
        type: 'alert',
        relatedTo: 'maintenance',
        relatedId: maintenanceId
      })
  },
  
  tenant: {
    paymentReceived: (userId: number, tenantId: number, amount: number) =>
      createNotification({
        userId,
        title: 'Paiement reçu',
        message: `Un paiement de ${amount}€ a été reçu`,
        type: 'info',
        relatedTo: 'tenant',
        relatedId: tenantId
      }),
    
    paymentLate: (userId: number, tenantId: number, daysLate: number) =>
      createNotification({
        userId,
        title: 'Retard de paiement',
        message: `Le paiement est en retard de ${daysLate} jours`,
        type: 'warning',
        relatedTo: 'tenant',
        relatedId: tenantId
      })
  },
  
  property: {
    inspection: (userId: number, propertyId: number, propertyName: string, date: Date) =>
      createNotification({
        userId,
        title: 'Inspection planifiée',
        message: `Une inspection est planifiée pour ${propertyName} le ${date.toLocaleDateString('fr-FR')}`,
        type: 'info',
        relatedTo: 'property',
        relatedId: propertyId
      }),
    
    issue: (userId: number, propertyId: number, propertyName: string, issue: string) =>
      createNotification({
        userId,
        title: 'Problème signalé',
        message: `Un problème a été signalé pour ${propertyName}: ${issue}`,
        type: 'warning',
        relatedTo: 'property',
        relatedId: propertyId
      }),
    
    leaseEnding: (userId: number, propertyId: number, propertyName: string, daysRemaining: number) =>
      createNotification({
        userId,
        title: 'Bail se terminant bientôt',
        message: `Le bail pour la propriété ${propertyName} se termine dans ${daysRemaining} jours`,
        type: 'warning',
        relatedTo: 'property',
        relatedId: propertyId
      })
  },
  
  marketplace: {
    newListing: (userId: number, listingId: number, partnerName: string) =>
      createNotification({
        userId,
        title: 'Nouveau partenaire sur la marketplace',
        message: `${partnerName} vient de rejoindre notre marketplace avec des offres exclusives`,
        type: 'info',
        relatedTo: 'marketplace',
        relatedId: listingId
      }),
    
    specialOffer: (userId: number, listingId: number, partnerName: string, offerDetails: string) =>
      createNotification({
        userId,
        title: 'Offre spéciale marketplace',
        message: `${partnerName} propose une offre spéciale: ${offerDetails}`,
        type: 'info',
        relatedTo: 'marketplace',
        relatedId: listingId
      }),
    
    promotionalCode: (userId: number, listingId: number, partnerName: string, code: string) =>
      createNotification({
        userId,
        title: 'Nouveau code promo',
        message: `Utilisez le code ${code} pour bénéficier d'une remise chez ${partnerName}`,
        type: 'info',
        relatedTo: 'marketplace',
        relatedId: listingId
      })
  }
};
