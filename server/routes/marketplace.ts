import { Router } from 'express';
import { db } from '../db';
import logger from '../utils/logger';
import { ensureAuth } from '../middleware/auth';
import { notificationFactory } from '../utils/notification-helper';

const router = Router();

// Get all marketplace listings
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Implement real database query when schema is available
    // For now, return dummy data
    const marketplaceListings = [
      {
        id: 1,
        name: "Maison Deco Premium",
        category: "Décoration",
        description: "Spécialiste en décoration d'intérieur haut de gamme",
        logo: "/logos/maison-deco.png",
        promoCode: "IMUMO25",
        featured: true
      },
      {
        id: 2,
        name: "AssurHabitat Pro",
        category: "Assurance",
        description: "Solutions d'assurance complètes pour propriétaires et locataires",
        logo: "/logos/assurhabitat.png",
        promoCode: "IMUMO15",
        featured: false
      }
    ];

    res.json(marketplaceListings);
  } catch (error) {
    logger.error(`Error fetching marketplace listings: ${error}`);
    res.status(500).json({ error: 'Erreur lors de la récupération des offres marketplace' });
  }
});

// Get a specific marketplace listing
router.get('/:id', ensureAuth, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    
    // Implement real database query when schema is available
    // For now, return dummy data
    const listing = {
      id: listingId,
      name: "Maison Deco Premium",
      category: "Décoration",
      description: "Spécialiste en décoration d'intérieur haut de gamme",
      logo: "/logos/maison-deco.png",
      promoCode: "IMUMO25",
      featured: true,
      address: "15 Avenue Montaigne, 75008 Paris",
      phone: "+33 1 23 45 67 89",
      email: "contact@maisondeco.com",
      website: "https://maisondeco-premium.fr",
      benefits: ["Consultation gratuite", "Remise de 15% pour clients ImùMo", "Livraison offerte"],
      photos: [
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?q=80&w=800&h=600&auto=format"
      ],
      rating: 4.8
    };

    res.json(listing);
  } catch (error) {
    logger.error(`Error fetching marketplace listing: ${error}`);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'offre marketplace' });
  }
});

// Add a new marketplace listing
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { name, category, description, featured, promoCode } = req.body;
    
    // Validate required fields
    if (!name || !category || !description) {
      return res.status(400).json({ error: 'Nom, catégorie et description sont requis' });
    }
    
    // Implement real database insert when schema is available
    // For now, just log and return success
    logger.info(`Creating new marketplace listing: ${name}`);
    
    // Dummy listing with generated ID
    const newListing = {
      id: Math.floor(Math.random() * 1000),
      name,
      category,
      description,
      featured: featured || false,
      promoCode: promoCode || null,
      createdAt: new Date().toISOString()
    };
    
    // Notify all users about the new marketplace listing
    // In a real implementation, you would query for all users and notify them
    // For demonstration purposes, we'll just notify user ID 1
    await notificationFactory.marketplace.newListing(1, newListing.id, name);
    
    res.status(201).json(newListing);
  } catch (error) {
    logger.error(`Error creating marketplace listing: ${error}`);
    res.status(500).json({ error: 'Erreur lors de la création de l\'offre marketplace' });
  }
});

// Add a special offer to a marketplace listing
router.post('/:id/offers', ensureAuth, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const { title, description, expiryDate } = req.body;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Titre et description sont requis' });
    }
    
    // Implement real database operations when schema is available
    // For now, just log and return success
    logger.info(`Adding special offer to marketplace listing ${listingId}: ${title}`);
    
    const specialOffer = {
      id: Math.floor(Math.random() * 1000),
      listingId,
      title,
      description,
      expiryDate: expiryDate || null,
      createdAt: new Date().toISOString()
    };
    
    // Get the marketplace listing name
    // In a real implementation, you would query the database
    const listingName = "Maison Deco Premium"; // Placeholder
    
    // Notify all users about the new special offer
    // For demonstration purposes, we'll just notify user ID 1
    await notificationFactory.marketplace.specialOffer(1, listingId, listingName, title);
    
    res.status(201).json(specialOffer);
  } catch (error) {
    logger.error(`Error adding special offer to marketplace listing: ${error}`);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'offre spéciale' });
  }
});

// Add a promotional code to a marketplace listing
router.post('/:id/promo-codes', ensureAuth, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const { code, discount, expiryDate } = req.body;
    
    // Validate required fields
    if (!code || !discount) {
      return res.status(400).json({ error: 'Code et réduction sont requis' });
    }
    
    // Implement real database operations when schema is available
    // For now, just log and return success
    logger.info(`Adding promo code to marketplace listing ${listingId}: ${code}`);
    
    const promoCode = {
      id: Math.floor(Math.random() * 1000),
      listingId,
      code,
      discount,
      expiryDate: expiryDate || null,
      createdAt: new Date().toISOString()
    };
    
    // Get the marketplace listing name
    // In a real implementation, you would query the database
    const listingName = "Maison Deco Premium"; // Placeholder
    
    // Notify all users about the new promo code
    // For demonstration purposes, we'll just notify user ID 1
    await notificationFactory.marketplace.promotionalCode(1, listingId, listingName, code);
    
    res.status(201).json(promoCode);
  } catch (error) {
    logger.error(`Error adding promo code to marketplace listing: ${error}`);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du code promo' });
  }
});

export default router; 