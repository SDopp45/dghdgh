import { Router } from "express";
import { db, pool } from "../db/index";
import { properties, propertyCoordinates, insertPropertySchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import logger from "../utils/logger";
import path from "path";
import fs from "fs";
import { createDefaultImageEntry } from "../utils/default-images";
import { ensureAuth } from "../middleware/auth";
import { getClientDb } from "../db/index";

const router = Router();

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'properties');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Ajoutez cette interface en haut du fichier
interface Coordinates {
  latitude: number | string;
  longitude: number | string;
}

// Interface pour les images de propriété
interface PropertyImage {
  id: number;
  filename: string;
  order: number;
}

router.post("/", ensureAuth, upload.array("images"), async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    logger.info("Creating property with data:", req.body);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);

    // Convert numeric string fields to numbers
    const numericFields = ['units', 'bedrooms', 'floors', 'bathrooms', 'toilets', 'livingArea', 'landArea', 'constructionYear', 'area', 'rooms'];
    numericFields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = Number(req.body[field]);
      }
    });

    // Convert boolean string fields to actual booleans
    const booleanFields = ['hasParking', 'hasTerrace', 'hasGarage', 'hasOutbuilding', 'hasBalcony', 'hasElevator', 'hasCellar', 'hasGarden', 'isNewConstruction'];
    booleanFields.forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = req.body[field] === 'true';
      }
    });

    // Handle dates
    if (req.body.purchaseDate || req.body.acquisitionDate) {
      req.body.purchaseDate = new Date(req.body.purchaseDate || req.body.acquisitionDate);
    }

    // Handle image uploads
    const uploadedFiles = req.files as Express.Multer.File[];
    let images = uploadedFiles?.map((file, index) => ({
      id: Date.now() + index,
      filename: file.filename,
      order: index
    })) || [];

    // Si aucune image n'a été téléchargée et que le paramètre useDefaultImage est défini
    if (images.length === 0 && req.body.useDefaultImage === 'true' && req.body.type) {
      const defaultImage = createDefaultImageEntry(req.body.type);
      if (defaultImage) {
        images = [defaultImage];
        logger.info(`Using default image for property type ${req.body.type}: ${defaultImage.filename}`);
      }
    }

    // Parse coordinates
    let coordinates: Coordinates | undefined;
    if (req.body.coordinates) {
      try {
        coordinates = JSON.parse(req.body.coordinates);
        logger.info("Parsed coordinates:", coordinates);
      } catch (e) {
        logger.error("Error parsing coordinates:", e);
        throw new Error("Invalid coordinates format");
      }
    }

    // Parse and validate the incoming data
    const parsedData = insertPropertySchema.parse({
      ...req.body,
      images: images
    });

    // Clean up and transform data
    const propertyData = {
      ...parsedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logger.info("Final property data to insert:", propertyData);

    const propertyResult = await pool.query(`
      INSERT INTO ${user ? `client_${user.id}` : 'public'}.properties (
        name, address, description, type, units, bedrooms, floors,
        bathrooms, toilets, energy_class, energy_emissions, living_area,
        land_area, has_parking, has_terrace, has_garage, has_outbuilding,
        has_balcony, has_elevator, has_cellar, has_garden, is_new_construction,
        purchase_price, monthly_rent, monthly_expenses, loan_amount,
        monthly_loan_payment, loan_duration, status, construction_year,
        purchase_date, rooms, images, user_id, area,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35, $36, $37
      ) RETURNING *
    `, [
      propertyData.name,
      propertyData.address,
      propertyData.description || null,
      propertyData.type,
      propertyData.units || 0,
      propertyData.bedrooms || 0,
      propertyData.floors || 0,
      propertyData.bathrooms || 0,
      propertyData.toilets || 0,
      propertyData.energyClass || null,
      propertyData.energyEmissions || null,
      propertyData.livingArea || 0,
      propertyData.landArea || 0,
      propertyData.hasParking || false,
      propertyData.hasTerrace || false,
      propertyData.hasGarage || false,
      propertyData.hasOutbuilding || false,
      propertyData.hasBalcony || false,
      propertyData.hasElevator || false,
      propertyData.hasCellar || false,
      propertyData.hasGarden || false,
      propertyData.isNewConstruction || false,
      propertyData.purchasePrice || '0',
      propertyData.monthlyRent || '0',
      propertyData.monthlyExpenses || null,
      propertyData.loanAmount || '0',
      propertyData.monthlyLoanPayment || '0',
      propertyData.loanDuration || null,
      propertyData.status || 'available',
      propertyData.constructionYear || null,
      propertyData.purchaseDate || null,
      propertyData.rooms || 0,
      JSON.stringify(images || []),
      user.id,
      propertyData.area || 0,
      new Date(),
      new Date()
    ]);
    
    const newProperty = propertyResult.rows[0];
    logger.info("Property inserted successfully:", newProperty);

      // If we have coordinates, insert them
      if (coordinates && coordinates.latitude && coordinates.longitude) {
      logger.info("Inserting coordinates for property:", newProperty.id);

      await pool.query(`
        INSERT INTO ${user ? `client_${user.id}` : 'public'}.property_coordinates (
          property_id, latitude, longitude, created_at, updated_at
        ) VALUES (
          $1, $2, $3, NOW(), NOW()
        )
      `, [
        newProperty.id,
        coordinates.latitude.toString(),
        coordinates.longitude.toString()
      ]);

        logger.info("Coordinates inserted successfully");
      }

    logger.info("Property and coordinates created successfully:", newProperty);

    res.json(newProperty);
  } catch (error: any) {
    logger.error("Error creating property:", error);
    res.status(500).json({ error: error.message || "Error creating property" });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

router.get("/", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    logger.info("Fetching all properties - start");
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);
    
    // Utiliser une requête SQL directe avec le schéma approprié
    const result = await pool.query(`
      SELECT * FROM ${user ? `client_${user.id}` : 'public'}.properties
      ORDER BY created_at DESC
      LIMIT 100
    `);
      
    logger.info(`Properties fetched successfully: ${result.rows.length} properties found`);
    res.json(result.rows || []);
  } catch (error) {
    logger.error("Error fetching properties:", error);
    // Retourner un tableau vide au lieu d'une erreur 500
    res.json([]);
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Add DELETE endpoint
router.delete("/:id", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const propertyId = Number(req.params.id);
    logger.info(`Deleting property with ID: ${propertyId}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);

    // First, get the property to retrieve its images
    const propertyResult = await pool.query(`
      SELECT * FROM ${user ? `client_${user.id}` : 'public'}.properties
      WHERE id = $1
    `, [propertyId]);

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    const property = propertyResult.rows[0];

    // Delete associated coordinates first
    await pool.query(`
      DELETE FROM ${user ? `client_${user.id}` : 'public'}.property_coordinates
      WHERE property_id = $1
    `, [propertyId]);
    
    logger.info(`Deleted coordinates for property ID: ${propertyId}`);

    // Delete associated image files if they exist
    if (property.images && Array.isArray(property.images)) {
      for (const image of property.images) {
        if (image && image.filename) {
          const imagePath = path.join(process.cwd(), 'uploads', 'properties', image.filename);
          try {
            await fs.promises.unlink(imagePath);
            logger.info(`Deleted image file: ${imagePath}`);
          } catch (err) {
            logger.warn(`Failed to delete image file: ${imagePath}`, err);
            // Continue with deletion even if image file removal fails
          }
        }
      }
    }

    // Delete the property from the database
    await pool.query(`
      DELETE FROM ${user ? `client_${user.id}` : 'public'}.properties
      WHERE id = $1
    `, [propertyId]);
    
    logger.info(`Successfully deleted property with ID: ${propertyId}`);

    res.json({ message: "Property deleted successfully" });
  } catch (error: any) {
    logger.error("Error deleting property:", error);
    res.status(500).json({ error: error.message || "Error deleting property" });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Add PUT endpoint for updating properties
router.put("/:id", ensureAuth, upload.array("images"), async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const propertyId = Number(req.params.id);
    logger.info(`Updating property with ID: ${propertyId}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);

    // Convert numeric string fields to numbers
    const numericFields = ['units', 'bedrooms', 'floors', 'bathrooms', 'toilets', 'livingArea', 'landArea', 'constructionYear', 'area', 'rooms'];
    numericFields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = Number(req.body[field]);
      }
    });

    // Convert boolean string fields to actual booleans
    const booleanFields = ['hasParking', 'hasTerrace', 'hasGarage', 'hasOutbuilding', 'hasBalcony', 'hasElevator', 'hasCellar', 'hasGarden', 'isNewConstruction'];
    booleanFields.forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = req.body[field] === 'true';
      }
    });

    // Handle dates
    if (req.body.purchaseDate || req.body.acquisitionDate) {
      req.body.purchaseDate = new Date(req.body.purchaseDate || req.body.acquisitionDate);
    }

    // Get existing property to handle image updates
    const existingPropertyResult = await pool.query(`
      SELECT * FROM ${user ? `client_${user.id}` : 'public'}.properties
      WHERE id = $1
    `, [propertyId]);

    if (existingPropertyResult.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    const existingProperty = existingPropertyResult.rows[0];

    // Handle new image uploads
    const uploadedFiles = req.files as Express.Multer.File[];
    let images = existingProperty.images || [];

    // Si des images sont marquées pour suppression
    let hasDeletedImages = false;
    if (req.body.deletedImages) {
      const deletedImages = JSON.parse(req.body.deletedImages);
      // Delete the image files
      for (const filename of deletedImages) {
        const imagePath = path.join(process.cwd(), 'uploads', 'properties', filename);
        try {
          await fs.promises.unlink(imagePath);
          logger.info(`Deleted image file: ${imagePath}`);
          hasDeletedImages = true;
        } catch (err) {
          logger.warn(`Failed to delete image file: ${imagePath}`, err);
        }
      }
      // Filter out deleted images from the images array
      images = images.filter((img: PropertyImage) => !deletedImages.includes(img.filename));
    }

    // Ajouter des nouvelles images si fournies
    if (uploadedFiles && uploadedFiles.length > 0) {
      const newImages = uploadedFiles.map((file, index) => ({
        id: Date.now() + index,
        filename: file.filename,
        order: images.length + index
      }));
      images = [...images, ...newImages];
    }
    
    // Si toutes les images ont été supprimées et qu'aucune nouvelle n'a été ajoutée,
    // utiliser l'image par défaut correspondant au type de propriété
    if (images.length === 0 && hasDeletedImages && req.body.type) {
      const defaultImage = createDefaultImageEntry(req.body.type);
      if (defaultImage) {
        images = [defaultImage];
        logger.info(`Using default image for property type ${req.body.type} during update: ${defaultImage.filename}`);
      }
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      images,
      updatedAt: new Date()
    };

    // Si des coordonnées sont fournies, les mettre à jour
    if (req.body.latitude && req.body.longitude) {
      const latitude = req.body.latitude.toString();
      const longitude = req.body.longitude.toString();

      // Vérifier si des coordonnées existent déjà pour cette propriété
      const existingCoordsResult = await pool.query(`
        SELECT * FROM ${user ? `client_${user.id}` : 'public'}.property_coordinates
        WHERE property_id = $1
      `, [propertyId]);
      
      const existingCoordinates = existingCoordsResult.rows[0];

      if (existingCoordinates) {
        // Mettre à jour les coordonnées existantes
        await pool.query(`
          UPDATE ${user ? `client_${user.id}` : 'public'}.property_coordinates
          SET latitude = $1, longitude = $2, updated_at = NOW()
          WHERE id = $3
        `, [latitude, longitude, existingCoordinates.id]);
      } else {
        // Créer de nouvelles coordonnées
        await pool.query(`
          INSERT INTO ${user ? `client_${user.id}` : 'public'}.property_coordinates (property_id, latitude, longitude, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [propertyId, latitude, longitude]);
      }
      logger.info(`Updated coordinates for property ID: ${propertyId}`);
    }

    // Mappings pour convertir les clés camelCase en snake_case pour la base de données
    const fieldMappings = {
      name: "name",
      address: "address",
      description: "description",
      type: "type",
      units: "units",
      bedrooms: "bedrooms",
      floors: "floors",
      bathrooms: "bathrooms",
      toilets: "toilets",
      energyClass: "energy_class",
      energyEmissions: "energy_emissions",
      livingArea: "living_area",
      landArea: "land_area",
      hasParking: "has_parking",
      hasTerrace: "has_terrace",
      hasGarage: "has_garage",
      hasOutbuilding: "has_outbuilding",
      hasBalcony: "has_balcony",
      hasElevator: "has_elevator",
      hasCellar: "has_cellar",
      hasGarden: "has_garden",
      isNewConstruction: "is_new_construction",
      purchasePrice: "purchase_price",
      monthlyRent: "monthly_rent",
      monthlyExpenses: "monthly_expenses",
      loanAmount: "loan_amount",
      monthlyLoanPayment: "monthly_loan_payment",
      loanDuration: "loan_duration",
      status: "status",
      constructionYear: "construction_year",
      purchaseDate: "purchase_date",
      rooms: "rooms",
      area: "area",
      images: "images"
    };

    // Construire les paires colonne=valeur pour la mise à jour
    const updatePairs: string[] = [];
    const values: any[] = [];
    
    // Parcourir les données à mettre à jour
    Object.entries(updateData).forEach(([key, value]) => {
      // Ignorer les champs qui ne doivent pas être mis à jour
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || !fieldMappings[key as keyof typeof fieldMappings]) {
        return;
      }
      
      // Obtenir le nom de colonne SQL correspondant
      const columnName = fieldMappings[key as keyof typeof fieldMappings];
      
      // Traiter spécialement le champ images
      if (key === 'images') {
        updatePairs.push(`${columnName} = $${values.length + 1}`);
        values.push(JSON.stringify(value || []));
        return;
      }
      
      // Ajouter la paire colonne=valeur
      updatePairs.push(`${columnName} = $${values.length + 1}`);
      values.push(value);
    });
    
    // Ajouter la mise à jour du champ updated_at
    updatePairs.push(`updated_at = NOW()`);

    // S'assurer qu'il y a des champs à mettre à jour
    if (updatePairs.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Construire la requête SQL complète
    const updateQuery = `
      UPDATE ${user ? `client_${user.id}` : 'public'}.properties
      SET ${updatePairs.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING *
    `;
    
    // Exécuter la mise à jour
    const updateResult = await pool.query(updateQuery, [...values, propertyId]);

    const updatedProperty = updateResult.rows[0];
    logger.info("Property updated successfully:", updatedProperty);
    res.json(updatedProperty);
  } catch (error: any) {
    logger.error("Error updating property:", error);
    res.status(500).json({ error: error.message || "Error updating property" });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Add this new endpoint after the existing PUT endpoint
// Status update endpoint
router.patch("/:id/status", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const propertyId = Number(req.params.id);
    const { status } = req.body;

    logger.info(`Updating status for property ${propertyId} to ${status}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);

    // Validate the status
    if (!["available", "rented", "maintenance", "sold"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // Update the property status
    const updateResult = await pool.query(`
      UPDATE ${user ? `client_${user.id}` : 'public'}.properties
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, propertyId]);
    
    const updatedProperty = updateResult.rows[0];

    if (!updatedProperty) {
      return res.status(404).json({ error: "Property not found" });
    }

    logger.info(`Successfully updated status for property ${propertyId}`);
    res.json(updatedProperty);
  } catch (error: any) {
    logger.error("Error updating property status:", error);
    res.status(500).json({ error: error.message || "Error updating property status" });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Endpoint pour récupérer l'historique des propriétés
router.get("/history", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const startDateString = req.query.startDate as string;
    const startDate = startDateString ? new Date(startDateString) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    
    logger.info(`Getting property history data since ${startDate.toISOString()}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);
    
    // Récupérer toutes les propriétés
    const propertiesResult = await pool.query(`
      SELECT p.*, pc.latitude, pc.longitude 
      FROM ${user ? `client_${user.id}` : 'public'}.properties p
      LEFT JOIN ${user ? `client_${user.id}` : 'public'}.property_coordinates pc ON p.id = pc.property_id
    `);
    
    const allProperties = propertiesResult.rows;
    
    // Générer un historique pour chaque propriété
    const historyData = [];
    
    for (const property of allProperties) {
      // Générer un historique mensuel à partir de startDate jusqu'à aujourd'hui
      const today = new Date();
      let currentDate = new Date(startDate);
      
      while (currentDate <= today) {
        // Créer une entrée d'historique pour cette propriété et ce mois
        historyData.push({
          propertyId: property.id,
          date: new Date(currentDate).toISOString(),
          value: property.currentValue || property.purchasePrice,
          yield: property.rentalYield || property.targetYield || 5,
          occupancy: property.status === 'rented' || property.status === 'occupied' ? 100 : 0,
        });
        
        // Passer au mois suivant
        currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
      }
    }
    
    res.json(historyData);
  } catch (error) {
    logger.error("Error fetching property history:", error);
    res.status(500).json({ error: "Failed to fetch property history" });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

export default router;