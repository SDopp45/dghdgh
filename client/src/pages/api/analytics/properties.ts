import { NextApiRequest, NextApiResponse } from 'next';
import { subMonths, format } from 'date-fns';

// Données simulées en attendant l'implémentation complète avec Prisma
const generatePropertyAnalytics = (propertyId?: string) => {
  // Simuler un délai réseau
  return new Promise<any[]>((resolve) => {
    setTimeout(() => {
      // Générer des propriétés avec leurs analyses
      const properties = [
        {
          propertyId: 1,
          propertyName: "Appartement Paris 11ème",
          marketValue: 450000,
          purchasePrice: 400000,
          appreciation: 12.5,
          rentPrice: 1800,
          roi: 5.4,
          occupancyRate: 98,
          previousOccupancyRate: 95,
          maintenanceCosts: 250,
          cashflow: 1400,
          areaRating: 4.2,
          insights: [
            "Le bien a connu une appréciation de 12.5% depuis l'acquisition",
            "Rendement locatif de 5.4%, supérieur à la moyenne du marché"
          ]
        },
        {
          propertyId: 2,
          propertyName: "Maison Bordeaux",
          marketValue: 320000,
          purchasePrice: 290000,
          appreciation: 10.3,
          rentPrice: 1200,
          roi: 5.0,
          occupancyRate: 100,
          previousOccupancyRate: 100,
          maintenanceCosts: 180,
          cashflow: 920,
          areaRating: 4.5,
          insights: [
            "Le bien a connu une appréciation de 10.3% depuis l'acquisition",
            "Performance stable avec un ROI de 5.0% et une occupation de 100%"
          ]
        },
        {
          propertyId: 3,
          propertyName: "Studio Lyon",
          marketValue: 180000,
          purchasePrice: 165000,
          appreciation: 9.1,
          rentPrice: 750,
          roi: 5.5,
          occupancyRate: 92,
          previousOccupancyRate: 88,
          maintenanceCosts: 120,
          cashflow: 580,
          areaRating: 3.8,
          insights: [
            "Le bien a connu une appréciation de 9.1% depuis l'acquisition",
            "Rendement locatif de 5.5%, supérieur à la moyenne du marché"
          ]
        }
      ];
      
      // Filtrer par ID si spécifié
      if (propertyId) {
        const id = parseInt(propertyId);
        const filtered = properties.filter(p => p.propertyId === id);
        resolve(filtered);
      } else {
        resolve(properties);
      }
    }, 200);
  });
};

/**
 * Contrôleur pour l'API d'analytics de propriétés
 * 
 * GET /api/analytics/properties - Récupère les analytics pour toutes les propriétés
 * GET /api/analytics/properties/:id - Récupère les analytics pour une propriété spécifique
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      const propertyId = id as string | undefined;
      
      const analytics = await generatePropertyAnalytics(propertyId);
      
      return res.status(200).json(analytics);
    } catch (error) {
      console.error('Erreur lors de la récupération des analytics de propriétés:', error);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des analytics de propriétés' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 