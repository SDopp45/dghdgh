import { z } from "zod";
import { format, isValid, parseISO } from "date-fns";

// Re-export schema from shared
export * from "../../../shared/schema";

// Helper functions
export const validateTransactionDate = (dateStr: string): Date => {
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    if (!isValid(date)) {
      throw new Error("Date invalide");
    }
    return date;
  }
  const date = parseISO(dateStr);
  if (!isValid(date)) {
    throw new Error("Date invalide");
  }
  return date;
};

export const formatTransactionDate = (date: Date): string => {
  return format(date, 'dd/MM/yyyy');
};