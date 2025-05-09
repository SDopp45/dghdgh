import { Router } from 'express';
import { ensureAuth, getUserId } from '../middleware/auth';
import { db, pool } from '../db';
import { properties, propertyCoordinates, propertyHistory, propertyWorks } from '@shared/schema';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import fetch from 'node-fetch';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// Get all property coordinates
router.get('/coordinates', ensureAuth, async (req, res) => {
  try {
    logger.info('Fetching property coordinates');
    const { propertyIds } = req.query;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    let query = `
      SELECT pc.*, p.id as property_id, p.name, p.address, p.type, p.status, p.purchase_price, p.monthly_rent
      FROM property_coordinates pc
      JOIN properties p ON pc.property_id = p.id
    `;
    
    const queryParams = [];
    
    // Si des IDs spécifiques sont fournis, filtrer par ces IDs
    if (propertyIds) {
      const ids = propertyIds.toString().split(',').map(Number);
      logger.info(`Filtering coordinates for properties: ${ids.join(', ')}`);
      
      query += ' WHERE pc.property_id = ANY($1)';
      queryParams.push(ids);
    }
    
    const result = await pool.query(query, queryParams);
    
    // Transformer les résultats pour qu'ils correspondent au format attendu
    const coordinates = result.rows.map(row => ({
      id: row.id,
      propertyId: row.property_id,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      property: {
        id: row.property_id,
        name: row.name,
        address: row.address,
        type: row.type,
        status: row.status,
        purchasePrice: row.purchase_price,
        monthlyRent: row.monthly_rent
      }
    }));

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    logger.info(`Found ${coordinates.length} valid coordinates`);
    res.json(coordinates);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching property coordinates:', err);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
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
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const result = await pool.query(`
      SELECT * FROM property_coordinates 
      WHERE property_id = $1
    `, [parseInt(propertyId)]);
    
    const coordinates = result.rows[0];
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(coordinates);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching property coordinates:', err);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: err.message });
  }
});

// Update property coordinates
router.post('/:propertyId/coordinates', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { latitude, longitude } = req.body;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Vérifier si des coordonnées existent déjà pour cette propriété
    const existingResult = await pool.query(`
      SELECT * FROM property_coordinates 
      WHERE property_id = $1
    `, [parseInt(propertyId)]);
    
    const existingCoordinates = existingResult.rows[0];

    if (existingCoordinates) {
      // Mettre à jour les coordonnées existantes
      await pool.query(`
        UPDATE property_coordinates
        SET latitude = $1, longitude = $2, updated_at = NOW()
        WHERE id = $3
      `, [latitude, longitude, existingCoordinates.id]);
    } else {
      // Créer de nouvelles coordonnées
      await pool.query(`
        INSERT INTO property_coordinates (property_id, latitude, longitude, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [parseInt(propertyId), latitude, longitude]);
    }

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    res.json({ message: 'Coordinates updated successfully' });
  } catch (error) {
    const err = error as Error;
    logger.error('Error updating property coordinates:', err);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: err.message });
  }
});

// Get property history
router.get('/:propertyId/history', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const result = await pool.query(`
      SELECT ph.*, u.username as user_name, u.email as user_email
      FROM property_history ph
      LEFT JOIN public.users u ON ph.user_id = u.id
      WHERE ph.property_id = $1
      ORDER BY ph.created_at DESC
    `, [parseInt(propertyId)]);
    
    // Transformer les résultats pour qu'ils correspondent au format attendu par le frontend
    const history = result.rows.map(row => ({
      id: row.id,
      propertyId: row.property_id,
      action: row.action,
      details: row.details,
      createdAt: row.created_at,
      userId: row.user_id,
      user: {
        username: row.user_name,
        email: row.user_email
      }
    }));
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(history);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching property history:', err);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: err.message });
  }
});

// Add property work entry
router.post('/:propertyId/works', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const workData = {
      ...req.body,
      propertyId: parseInt(propertyId)
    };
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const result = await pool.query(`
      INSERT INTO property_works (
        property_id, title, description, estimated_cost, actual_cost, 
        start_date, end_date, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      parseInt(propertyId),
      workData.title,
      workData.description,
      workData.estimatedCost,
      workData.actualCost,
      workData.startDate,
      workData.endDate,
      workData.status || 'pending'
    ]);
    
    const newWork = result.rows[0];
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(newWork);
  } catch (error) {
    const err = error as Error;
    logger.error('Error adding property work:', err);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: err.message });
  }
});

// Get property works
router.get('/:propertyId/works', ensureAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status } = req.query;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Construire la requête SQL en fonction des paramètres
    let query;
    if (status && typeof status === 'string') {
      query = `
        SELECT * FROM property_works
        WHERE property_id = ${parseInt(propertyId)}
        AND status = '${status}'
        ORDER BY created_at DESC
      `;
    } else {
      query = `
        SELECT * FROM property_works
        WHERE property_id = ${parseInt(propertyId)}
        ORDER BY created_at DESC
      `;
    }
    
    const result = await pool.query(query);
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(result.rows);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching property works:', err);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: err.message });
  }
});

// Update property work status
router.patch('/:propertyId/works/:workId', ensureAuth, async (req, res) => {
  try {
    const { workId } = req.params;
    const { status, actualCost } = req.body;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const result = await pool.query(`
      UPDATE property_works
      SET status = $1, actual_cost = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, actualCost, parseInt(workId)]);
    
    if (result.rows.length === 0) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(404).json({ error: "Travaux non trouvés" });
    }

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    res.json({ message: 'Work status updated successfully', work: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    logger.error('Error updating work status:', err);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: err.message });
  }
});

export default router;