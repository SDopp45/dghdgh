import { NextApiRequest, NextApiResponse } from 'next';

// Simuler les données d'une API d'estimation immobilière
// En production, ce code ferait un appel à une API externe réelle comme:
// - API DVF (Demandes de valeurs foncières)
// - API Meilleursagents
// - API INSEE sur les prix de l'immobilier
// - API DataFoncier

// Données de prix au mètre carré simulées pour différentes villes et codes postaux
const priceData = [
  // Prix moyens pour grandes villes
  { location: 'paris', price: 10850, city: 'Paris', department: '75' },
  { location: '75001', price: 13500, city: 'Paris 1er', department: '75' },
  { location: '75002', price: 12800, city: 'Paris 2e', department: '75' },
  { location: '75003', price: 12200, city: 'Paris 3e', department: '75' },
  { location: '75004', price: 13100, city: 'Paris 4e', department: '75' },
  { location: '75005', price: 12800, city: 'Paris 5e', department: '75' },
  { location: '75006', price: 14200, city: 'Paris 6e', department: '75' },
  { location: '75007', price: 14500, city: 'Paris 7e', department: '75' },
  { location: '75008', price: 13800, city: 'Paris 8e', department: '75' },
  { location: '75009', price: 11900, city: 'Paris 9e', department: '75' },
  { location: '75010', price: 10500, city: 'Paris 10e', department: '75' },
  { location: '75011', price: 10200, city: 'Paris 11e', department: '75' },
  { location: '75012', price: 9800, city: 'Paris 12e', department: '75' },
  { location: '75013', price: 9600, city: 'Paris 13e', department: '75' },
  { location: '75014', price: 10100, city: 'Paris 14e', department: '75' },
  { location: '75015', price: 10400, city: 'Paris 15e', department: '75' },
  { location: '75016', price: 12200, city: 'Paris 16e', department: '75' },
  { location: '75017', price: 10800, city: 'Paris 17e', department: '75' },
  { location: '75018', price: 9500, city: 'Paris 18e', department: '75' },
  { location: '75019', price: 8900, city: 'Paris 19e', department: '75' },
  { location: '75020', price: 8800, city: 'Paris 20e', department: '75' },
  { location: 'lyon', price: 5300, city: 'Lyon', department: '69' },
  { location: '69001', price: 5600, city: 'Lyon 1er', department: '69' },
  { location: '69002', price: 5800, city: 'Lyon 2e', department: '69' },
  { location: '69003', price: 5400, city: 'Lyon 3e', department: '69' },
  { location: '69004', price: 5200, city: 'Lyon 4e', department: '69' },
  { location: '69005', price: 5100, city: 'Lyon 5e', department: '69' },
  { location: '69006', price: 5700, city: 'Lyon 6e', department: '69' },
  { location: '69007', price: 4900, city: 'Lyon 7e', department: '69' },
  { location: '69008', price: 4600, city: 'Lyon 8e', department: '69' },
  { location: '69009', price: 4500, city: 'Lyon 9e', department: '69' },
  { location: 'marseille', price: 3600, city: 'Marseille', department: '13' },
  { location: 'bordeaux', price: 4800, city: 'Bordeaux', department: '33' },
  { location: 'lille', price: 3500, city: 'Lille', department: '59' },
  { location: 'toulouse', price: 3800, city: 'Toulouse', department: '31' },
  { location: 'nice', price: 4600, city: 'Nice', department: '06' },
  { location: 'nantes', price: 4200, city: 'Nantes', department: '44' },
  { location: 'strasbourg', price: 3700, city: 'Strasbourg', department: '67' },
  { location: 'montpellier', price: 3600, city: 'Montpellier', department: '34' },
  
  // Prix moyens pour villes moyennes
  { location: 'rennes', price: 3900, city: 'Rennes', department: '35' },
  { location: 'grenoble', price: 3400, city: 'Grenoble', department: '38' },
  { location: 'toulon', price: 3200, city: 'Toulon', department: '83' },
  { location: 'dijon', price: 2700, city: 'Dijon', department: '21' },
  { location: 'angers', price: 2800, city: 'Angers', department: '49' },
  { location: 'le mans', price: 2200, city: 'Le Mans', department: '72' },
  { location: 'reims', price: 2500, city: 'Reims', department: '51' },
  { location: 'avignon', price: 2400, city: 'Avignon', department: '84' },
  { location: 'mulhouse', price: 1800, city: 'Mulhouse', department: '68' },
  
  // Prix moyens pour petites villes
  { location: 'gap', price: 2100, city: 'Gap', department: '05' },
  { location: 'rodez', price: 1700, city: 'Rodez', department: '12' },
  { location: 'aurillac', price: 1500, city: 'Aurillac', department: '15' },
  { location: 'gueret', price: 1200, city: 'Guéret', department: '23' },
  { location: 'mende', price: 1400, city: 'Mende', department: '48' },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Simuler un délai d'API externe
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Récupérer le paramètre de localisation (facultatif)
      const { location } = req.query;
      
      // Si une localisation spécifique est demandée, filtrer les résultats
      if (location) {
        const locationStr = String(location).toLowerCase();
        const matchingPrices = priceData.filter(item => 
          item.location.toLowerCase().includes(locationStr) || 
          item.city.toLowerCase().includes(locationStr)
        );
        
        if (matchingPrices.length === 0) {
          return res.status(404).json({ 
            message: 'Aucune donnée disponible pour cette localisation' 
          });
        }
        
        return res.status(200).json(matchingPrices);
      }
      
      // Sinon, renvoyer toutes les données
      return res.status(200).json(priceData);
    } catch (error) {
      console.error('Erreur lors de la récupération des prix au m²:', error);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des prix au m²' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 
 
 