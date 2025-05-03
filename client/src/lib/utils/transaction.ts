import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import type { Transaction } from "@shared/schema";

export const formatAmount = (amount: number | string, currency: string = "EUR") => {
  try {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    }).format(numAmount || 0);
  } catch (error) {
    console.error("Erreur lors du formatage du montant");
    return "0,00 €";
  }
};

export const formatTransactionDate = (dateStr: string | Date | null) => {
  try {
    if (!dateStr) {
      throw new Error("Date manquante");
    }

    let date: Date;

    if (dateStr instanceof Date) {
      date = dateStr;
    } else if (typeof dateStr === "string") {
      // If date is in French format (DD/MM/YYYY)
      if (dateStr.includes("/")) {
        const [day, month, year] = dateStr.split("/").map(Number);
        date = new Date(year, month - 1, day);
      } else {
        // If date is in ISO format
        date = parseISO(dateStr);
      }
    } else {
      throw new Error("Format de date invalide");
    }

    if (!isValid(date)) {
      throw new Error("Date invalide");
    }

    return {
      display: format(date, "dd/MM/yyyy", { locale: fr }),
      iso: format(date, "yyyy-MM-dd"), // Use yyyy-MM-dd format for consistency
    };
  } catch (error) {
    console.warn("Erreur de formatage de date");
    const now = new Date();
    return {
      display: format(now, "dd/MM/yyyy", { locale: fr }),
      iso: format(now, "yyyy-MM-dd"),
    };
  }
};

export const formatTransaction = (transaction: Partial<Transaction>) => {
  try {
    if (!transaction) {
      throw new Error("Transaction manquante");
    }

    const formattedDate = formatTransactionDate(transaction.date || null);
    
    // Gestion des documents
    let documentId = transaction.documentId || null;
    let documentIds: number[] = [];
    
    // Si documentIds est un array existant, l'utiliser
    if (Array.isArray(transaction.documentIds) && transaction.documentIds.length > 0) {
      documentIds = transaction.documentIds;
    }
    // Si seulement documentId existe et n'est pas null, créer un array avec
    else if (documentId) {
      documentIds = [documentId];
    }

    const propertyName = typeof transaction.propertyId === 'number' 
      ? (transaction as any).property?.name || "N/A"
      : "N/A";
    
    const tenantName = typeof transaction.tenantId === 'number'
      ? (transaction as any).tenant?.user?.fullName || "N/A"
      : "N/A";

    return {
      ...transaction,
      propertyName,
      tenantName,
      formattedDate: formattedDate.display,
      displayDate: formattedDate.display,
      date: formattedDate.iso,
      formattedAmount: formatAmount(transaction.amount || 0),
      amountClass: transaction.type === "income" 
        ? "text-green-600" 
        : transaction.type === "expense" 
        ? "text-red-600" 
        : "text-blue-600",
      amountPrefix: transaction.type === "income" ? "+" : "-",
      documentId, // Conserver le documentId existant
      documentIds, // Ajouter le tableau documentIds
    };
  } catch (error) {
    console.warn("Erreur lors du formatage de la transaction");
    const now = new Date();
    return {
      ...transaction,
      propertyName: "N/A",
      tenantName: "N/A",
      formattedDate: format(now, "dd/MM/yyyy", { locale: fr }),
      displayDate: format(now, "dd/MM/yyyy", { locale: fr }),
      date: format(now, "yyyy-MM-dd"),
      formattedAmount: formatAmount(0),
      amountClass: "text-gray-600",
      amountPrefix: "",
      documentId: null,
      documentIds: [],
    };
  }
};

export const validateTransaction = (data: Partial<Transaction>) => {
  const errors: Record<string, string> = {};

  if (!data.date) {
    errors.date = "La date est requise";
  } else {
    try {
      const formatted = formatTransactionDate(data.date);
      if (!formatted.iso) {
        errors.date = "Date invalide";
      }
    } catch {
      errors.date = "Format de date invalide";
    }
  }

  if (!data.amount || isNaN(Number(data.amount))) {
    errors.amount = "Le montant est requis et doit être un nombre";
  }

  if (!data.type) {
    errors.type = "Le type est requis";
  }

  if (!data.category) {
    errors.category = "La catégorie est requise";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};