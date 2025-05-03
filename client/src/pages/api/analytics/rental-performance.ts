import { NextApiRequest, NextApiResponse } from 'next';
import { subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Données simulées en attendant l'implémentation complète avec Prisma
const generateRentalPerformance = (months: number = 6) => {
  // Simuler un délai réseau
  return new Promise<any[]>((resolve) => {
    setTimeout(() => {
      const today = new Date();
      const performanceData = [];
      
      // Générer les métriques pour chaque mois demandé
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(today, i);
        const month = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM', { locale: fr });
        
        // Base d'occupation avec tendance progressive à la hausse
        const baseOccupancy = 85 + (Math.random() * 5);
        const trendFactor = (months - i) / months * 5; // Tendance positive sur la période
        const occupancyRate = Math.min(99, baseOccupancy + trendFactor);
        
        // Taux de recouvrement des loyers (entre 90% et 99%)
        const rentCollection = 90 + Math.random() * 9;
        
        // Rendement locatif (entre 5% et 6%)
        const rentalYield = 5 + Math.random();
        
        // Données du mois précédent (légèrement moins bonnes)
        const prevOccupancyRate = Math.max(75, occupancyRate - 2 + Math.random() * 4);
        const prevRentCollection = Math.max(85, rentCollection - 2 + Math.random() * 4);
        const prevRentalYield = Math.max(4, rentalYield - 0.3 + Math.random() * 0.6);
        
        performanceData.push({
          month,
          monthLabel,
          occupancyRate: parseFloat(occupancyRate.toFixed(1)),
          rentCollection: parseFloat(rentCollection.toFixed(1)),
          rentalYield: parseFloat(rentalYield.toFixed(1)),
          previous: {
            occupancyRate: parseFloat(prevOccupancyRate.toFixed(1)),
            rentCollection: parseFloat(prevRentCollection.toFixed(1)),
            rentalYield: parseFloat(prevRentalYield.toFixed(1))
          }
        });
      }
      
      resolve(performanceData);
    }, 200);
  });
};

/**
 * Contrôleur pour l'API de performances locatives
 * 
 * GET /api/analytics/rental-performance - Récupère les performances locatives
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { months } = req.query;
      const monthsCount = parseInt(months as string) || 6;
      
      const performanceData = await generateRentalPerformance(monthsCount);
      
      return res.status(200).json(performanceData);
    } catch (error) {
      console.error('Erreur lors de la récupération des performances locatives:', error);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des performances locatives' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 