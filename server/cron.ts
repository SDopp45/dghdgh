import cron from 'node-cron';
import logger from './utils/logger';
import { NotificationManager } from './services/notification-manager';

/**
 * Initialise toutes les tâches cron pour l'application
 */
export function initCronJobs() {
  logger.info('Initialisation des tâches planifiées...');

  // Créer une instance du gestionnaire de notifications
  const notificationManager = new NotificationManager();

  // Tâche qui s'exécute tous les jours à 7h du matin pour les notifications générales
  cron.schedule('0 7 * * *', async () => {
    logger.info('Exécution de la tâche planifiée : vérifications des notifications quotidiennes');
    await notificationManager.runAllChecks();
  });

  // Tâche qui s'exécute toutes les 12 heures pour la vérification des baux expirant dans les 24h
  // et les paiements attendus dans les 48h
  cron.schedule('0 */12 * * *', async () => {
    logger.info('Exécution de la tâche planifiée : vérification des baux et paiements');
    await notificationManager.checkLeasesEnding();
    await notificationManager.checkUpcomingPayments();
  });

  // Tâche qui s'exécute toutes les heures pour les nouvelles prestations et visites du jour
  cron.schedule('0 * * * *', async () => {
    logger.info('Exécution de la tâche planifiée : vérification des prestations et visites');
    await notificationManager.checkNewServices();
    await notificationManager.checkTodayInspections();
  });

  // Exécution immédiate au démarrage du serveur pour initialiser les notifications
  setTimeout(async () => {
    logger.info('Démarrage initial des vérifications de notifications');
    await notificationManager.runAllChecks();
  }, 5000); // Délai court au démarrage pour permettre à l'app de s'initialiser

  logger.info('Toutes les tâches planifiées ont été initialisées');
}

export default initCronJobs; 