import { db } from '../db';
import logger from '../utils/logger';
import { createNotification } from '../utils/notification-helper';
import { addDays, isSameDay } from 'date-fns';
import { eq, and, lte, gte } from 'drizzle-orm';

/**
 * Gestionnaire de notifications simplifié
 * Ce service génère uniquement 4 types de notifications automatiques
 */
export class NotificationManager {
  /**
   * Vérifie les baux qui expirent dans les 24 heures
   */
  async checkLeasesEnding() {
    try {
      const tomorrow = addDays(new Date(), 1);
    
      // Récupérer tous les baux qui expirent dans les 24h
      const expiringLeases = await db.query.leases.findMany({
        where: (leases: any, { and, eq, lte, gte }: { and: any, eq: any, lte: any, gte: any }) => {
          const today = new Date();
          const tomorrow = addDays(today, 1);
          return and(
            gte(leases.endDate, today),
            lte(leases.endDate, tomorrow)
          );
        },
        with: {
          property: true,
          tenant: true
        }
      });

      logger.info(`Trouvé ${expiringLeases.length} baux expirant dans les 24h`);
      
      // Créer des notifications pour chaque bail
      for (const lease of expiringLeases) {
        const { property, tenant } = lease;
        const propertyOwner = await db.query.users.findFirst({
          where: (users: any, { eq }: { eq: any }) => eq(users.id, property.ownerId)
        });

        if (propertyOwner) {
          await createNotification({
            userId: propertyOwner.id,
            title: `Bail se terminant bientôt`,
            message: `Le bail de ${tenant.firstName} ${tenant.lastName} pour la propriété "${property.name}" expire demain.`,
            type: 'alert',
            relatedTo: 'property',
            relatedId: property.id
          });
        }
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification des baux expirant:', error);
    }
  }
  
  /**
   * Vérifie les paiements attendus dans les 48 heures
   */
  async checkUpcomingPayments() {
    try {
      const twoDaysFromNow = addDays(new Date(), 2);
      
      // Récupérer tous les paiements en attente qui doivent être effectués dans les 48h
      const upcomingPayments = await db.query.payments.findMany({
        where: (payments: any, { and, eq, lte, gte }: { and: any, eq: any, lte: any, gte: any }) => {
          const today = new Date();
          const inTwoDays = addDays(today, 2);
          return and(
            eq(payments.status, 'PENDING'),
            gte(payments.dueDate, today),
            lte(payments.dueDate, inTwoDays)
        );
        },
        with: {
          property: true
        }
      });

      logger.info(`Trouvé ${upcomingPayments.length} paiements attendus dans les 48h`);

      // Créer des notifications pour chaque paiement
      for (const payment of upcomingPayments) {
        const { property } = payment;
        
        // Notifier le propriétaire
        if (property.ownerId) {
          await createNotification({
            userId: property.ownerId,
            title: `Paiement à venir`,
            message: `Un paiement de ${payment.amount}€ pour "${property.name}" est attendu dans les 48h.`,
            type: 'warning',
            relatedTo: 'property',
            relatedId: property.id
          });
        }

        // Notifier le locataire si applicable
        if (payment.tenantId) {
            await createNotification({
            userId: payment.tenantId,
            title: `Paiement à effectuer`,
            message: `Vous avez un paiement de ${payment.amount}€ pour "${property.name}" à effectuer dans les 48h.`,
              type: 'warning',
              relatedTo: 'tenant',
            relatedId: payment.tenantId
            });
        }
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification des paiements à venir:', error);
    }
  }
  
  /**
   * Vérifie les nouvelles prestations uploadées
   */
  async checkNewServices() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Récupérer toutes les prestations ajoutées dans les dernières 24h
      const newServices = await db.query.services.findMany({
        where: (services: any, { gte }: { gte: any }) => {
          return gte(services.createdAt, yesterday);
        },
        with: {
          provider: true
        }
      });

      logger.info(`Trouvé ${newServices.length} nouvelles prestations`);
      
      // Créer des notifications pour chaque nouvelle prestation
      for (const service of newServices) {
        // Notifier tous les propriétaires
        const owners = await db.query.users.findMany({
          where: (users: any, { eq }: { eq: any }) => eq(users.role, 'OWNER')
        });

        for (const owner of owners) {
          await createNotification({
            userId: owner.id,
            title: `Nouvelle prestation disponible`,
            message: `${service.provider?.name} propose une nouvelle prestation: "${service.name}" (${service.price}€)`,
            type: 'info',
            relatedTo: 'maintenance',
            relatedId: service.id
          });
        }
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification des nouvelles prestations:', error);
    }
  }
  
  /**
   * Vérifie les visites prévues aujourd'hui
   */
  async checkTodayInspections() {
    try {
    const today = new Date();
      
      // Récupérer toutes les visites prévues aujourd'hui
      const todayInspections = await db.query.inspections.findMany({
        where: (inspections: any, { and }: { and: any }) => {
          return and(
            // Condition pour vérifier si c'est le même jour (année, mois, jour)
            db.sql`DATE(${inspections.scheduledDate}) = DATE(${today})`
          );
        },
        with: {
          property: true
        }
      });

      logger.info(`Trouvé ${todayInspections.length} visites prévues aujourd'hui`);
      
      // Créer des notifications pour chaque visite
      for (const inspection of todayInspections) {
        const { property } = inspection;
        
        // Notifier le propriétaire
        if (property.ownerId) {
          await createNotification({
            userId: property.ownerId,
            title: `Visite aujourd'hui`,
            message: `Une visite est prévue aujourd'hui à ${inspection.scheduledDate.toLocaleTimeString()} pour "${property.name}".`,
            type: 'info',
            relatedTo: 'property',
            relatedId: property.id
          });
        }

        // Notifier le locataire si applicable
        if (property.currentTenantId) {
        await createNotification({
            userId: property.currentTenantId,
            title: `Visite aujourd'hui`,
            message: `Une visite est prévue aujourd'hui à ${inspection.scheduledDate.toLocaleTimeString()} pour votre logement.`,
          type: 'info',
            relatedTo: 'tenant',
            relatedId: property.currentTenantId
        });
        }
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification des visites du jour:', error);
    }
  }
  
  /**
   * Exécute toutes les vérifications de notifications
   */
  async runAllChecks() {
    await this.checkLeasesEnding();
      await this.checkUpcomingPayments();
    await this.checkNewServices();
    await this.checkTodayInspections();
    }
  }