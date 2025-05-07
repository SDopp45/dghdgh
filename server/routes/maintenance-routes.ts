import { Router } from "express";
import logger from "../utils/logger";
import { repairClientSchemas } from "../utils/db-repair";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// Route pour réparer les schémas clients (admin uniquement)
router.post("/repair-schemas", requireAdmin, async (req, res) => {
  try {
    logger.info("Demande de réparation des schémas clients reçue");
    
    const success = await repairClientSchemas();
    
    if (success) {
      logger.info("Réparation des schémas clients terminée avec succès");
      return res.json({ 
        success: true, 
        message: "Réparation des schémas clients terminée" 
      });
    } else {
      logger.error("Échec de la réparation des schémas clients");
      return res.status(500).json({ 
        success: false, 
        message: "Échec de la réparation des schémas clients" 
      });
    }
  } catch (error) {
    logger.error("Erreur lors de la réparation des schémas clients:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Erreur lors de la réparation des schémas clients",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 