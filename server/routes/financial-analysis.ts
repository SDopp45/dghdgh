import { Router } from 'express';
import { db } from '../db';
import { transactions } from '../../shared/schema';
import asyncHandler from '../utils/async-handler';
import logger from '../logger';

const router = Router();

// Route pour obtenir les statistiques financières
router.get('/stats', asyncHandler(async (req, res) => {
  // Cette route sera implémentée ultérieurement
  res.json({ message: "Financial stats endpoint" });
}));

export default router;