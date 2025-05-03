import express from "express";
import { db } from "@db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import logger from "../utils/logger";
import { AppError } from "../middleware/errorHandler";

const router = express.Router();

// Route PUT pour mettre à jour un utilisateur
router.put("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      throw new AppError("Non authentifié", 401);
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new AppError("ID utilisateur invalide", 400);
    }

    const { fullName, email, phoneNumber } = req.body;

    // Vérifier que l'utilisateur existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!existingUser) {
      throw new AppError("Utilisateur non trouvé", 404);
    }

    // Mettre à jour l'utilisateur
    const [updatedUser] = await db.update(users)
      .set({
        fullName,
        email,
        phoneNumber,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new AppError("Échec de la mise à jour de l'utilisateur", 500);
    }

    logger.info(`User ${userId} updated successfully`);
    res.json(updatedUser);
  } catch (error) {
    logger.error("Error updating user:", error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Erreur lors de la mise à jour de l'utilisateur" });
    }
  }
});

export default router; 