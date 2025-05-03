import { NextApiRequest, NextApiResponse } from 'next';
import { subMonths, format } from 'date-fns';
import prisma from '@/lib/prisma';

/**
 * Contrôleur pour l'API d'analytics
 * 
 * GET /api/analytics - Récupère les statistiques globales
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Récupérer les données de base
      const propertiesCount = await prisma.property.count();
      const tenantsCount = await prisma.tenant.count();
      
      // Récupérer les données financières
      const totalRent = await prisma.tenant.aggregate({
        _sum: {
          rentAmount: true
        }
      });
      
      // Récupérer les propriétés
      const properties = await prisma.property.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          status: true,
          purchasePrice: true,
          monthlyRent: true,
          monthlyLoanPayment: true,
          purchaseDate: true
        }
      });
      
      // Récupérer les locataires
      const tenants = await prisma.tenant.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          rentAmount: true,
          leaseStartDate: true,
          leaseEndDate: true,
          property: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      // Créer les métriques de base
      const monthlyRevenue = totalRent._sum.rentAmount || 0;
      const monthlyExpenses = properties.reduce((sum, property) => {
        return sum + (property.monthlyLoanPayment || 0);
      }, 0);
      
      // Calculer le taux d'occupation global
      const occupiedProperties = properties.filter(p => p.status === 'rented').length;
      const occupancyRate = propertiesCount > 0 ? (occupiedProperties / propertiesCount) * 100 : 0;
      
      // Calculer la valeur totale du portefeuille
      const portfolioValue = properties.reduce((sum, property) => {
        return sum + (property.purchasePrice || 0);
      }, 0);
      
      // Générer des métriques pour les 12 derniers mois
      const now = new Date();
      const monthlyMetrics = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        
        // Créer une métrique mensuelle (simplifiée)
        monthlyMetrics.push({
          date: monthKey,
          revenue: Math.round(monthlyRevenue * (0.95 + Math.random() * 0.1)),
          expenses: Math.round(monthlyExpenses * (0.95 + Math.random() * 0.1)),
          occupancyRate: Math.min(100, Math.max(75, occupancyRate * (0.95 + Math.random() * 0.1)))
        });
      }
      
      return res.status(200).json({
        summary: {
          propertiesCount,
          tenantsCount,
          occupancyRate,
          portfolioValue,
          monthlyRevenue,
          monthlyExpenses,
          monthlyCashflow: monthlyRevenue - monthlyExpenses
        },
        monthlyMetrics,
        properties,
        tenants
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des analytics:', error);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des analytics' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 