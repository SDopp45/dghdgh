import { Router } from 'express';
import { ensureAuth } from '../middleware/auth';
import { db } from '@db';
import { properties, propertyCoordinates, propertyHistory, propertyWorks } from '@shared/schema';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import fetch from 'node-fetch';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all property coordinates
router.get('/coordinates', ensureAuth, async (req, res) => {
  try {
    logger.info('Fetching property coordinates');
    const { propertyIds } = req.query;

    let query = db.query.propertyCoordinates.findMany({
      with: {
        property: {
          columns: {
            id: true,
            name: true,
            address: true,
            type: true,
            status: true,
            purchasePrice: true,
            monthlyRent: true
          }
        }
      }
    });

    // Si des IDs spécifiques sont fournis, filtrer par ces IDs
    if (propertyIds) {
      const ids = propertyIds.toString().split(',').map(Number);
      logger.info(`Filtering coordinates for properties: ${ids.join(', ')}`);
      query = db.query.propertyCoordinates.findMany({
        where: (coordinates, { inArray }) => inArray(coordinates.propertyId, ids),
        with: {
          property: {
            columns: {
              id: true,
              name: true,
              address: true,
              type: true,
              status: true,
              purchasePrice: true,
              monthlyRent: true
            }
          }
        }
      });
    }

    const coordinates = await query;

    // Filter out any coordinates without associated properties
    const validCoordinates = coordinates.filter(coord => coord.property);

    logger.info(`Found ${validCoordinates.length} valid coordinates`);
    res.json(validCoordinates);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching property coordinates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Service de géocodage
async function geocodeAddress(address: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PropertyManagementApp/1.0'
      }
    });

    if (!response.ok) throw new Error('Erreur lors du géocodage');

    const data = await response.json() as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    return data.map((item) => ({
      address: item.display_name,
      coordinates: {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
      }
    }));
  } catch (error) {
    logger.error('Erreur lors du géocodage:', error);
    throw new AppError('Erreur lors du géocodage de l\'adresse', 500);
  }
}

// Endpoint de géocodage
router.get('/geocode', ensureAuth, async (req, res) => {
  try {
    const { address } = req.query;
    if (!address || typeof address !== 'string') {
      throw new AppError('Adresse requise', 400);
    }

    const suggestions = await geocodeAddress(address);
    res.json(suggestions);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erreur lors du géocodage' });
    }
  }
});

// Get property coordinates by ID
router.get('/:propertyId/coordinates', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const coordinates = await db.query.propertyCoordinates.findFirst({
      where: eq(propertyCoordinates.propertyId, parseInt(propertyId))
    });
    res.json(coordinates);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching property coordinates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update property coordinates
router.post('/:propertyId/coordinates', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { latitude, longitude } = req.body;

    const existingCoordinates = await db.query.propertyCoordinates.findFirst({
      where: eq(propertyCoordinates.propertyId, parseInt(propertyId))
    });

    if (existingCoordinates) {
      await db
        .update(propertyCoordinates)
        .set({ 
          latitude, 
          longitude,
          updatedAt: new Date()
        })
        .where(eq(propertyCoordinates.id, existingCoordinates.id));
    } else {
      await db.insert(propertyCoordinates).values({
        propertyId: parseInt(propertyId),
        latitude,
        longitude
      });
    }

    res.json({ message: 'Coordinates updated successfully' });
  } catch (error) {
    const err = error as Error;
    logger.error('Error updating property coordinates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get property history
router.get('/:propertyId/history', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const history = await db.query.propertyHistory.findMany({
      where: eq(propertyHistory.propertyId, parseInt(propertyId)),
      orderBy: (ph, { desc }) => [desc(ph.createdAt)],
      with: {
        user: true
      }
    });
    res.json(history);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching property history:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add property work entry
router.post('/:propertyId/works', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const workData = {
      ...req.body,
      propertyId: parseInt(propertyId)
    };

    const newWork = await db.insert(propertyWorks).values(workData);
    res.json(newWork);
  } catch (error) {
    const err = error as Error;
    logger.error('Error adding property work:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get property works
router.get('/:propertyId/works', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status } = req.query;

    let works = await db.query.propertyWorks.findMany({
      where: eq(propertyWorks.propertyId, parseInt(propertyId))
    });

    if (status) {
      works = works.filter(work => work.status === status);
    }

    res.json(works);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching property works:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update property work status
router.patch('/:propertyId/works/:workId', ensureAuth, async (req, res) => {
  try {
    const { workId } = req.params;
    const { status, actualCost } = req.body;

    await db
      .update(propertyWorks)
      .set({ 
        status,
        actualCost: actualCost,
        updatedAt: new Date()
      })
      .where(eq(propertyWorks.id, parseInt(workId)));

    res.json({ message: 'Work status updated successfully' });
  } catch (error) {
    const err = error as Error;
    logger.error('Error updating work status:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;