import { Router } from "express";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logger from "../utils/logger";

const router = Router();

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount)
    .replace(/\s/g, ' ');
};

// Fonction pour formater les grands nombres dans le corps du tableau
const formatLargeNumber = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M €`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K €`;
  }
  return `${value.toFixed(0)} €`;
};


export default router;