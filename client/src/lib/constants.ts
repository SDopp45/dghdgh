// Constants des catégories de transactions
// Importées depuis le serveur pour garantir la cohérence

export const TRANSACTION_CATEGORIES = {
  RENT: "rent",
  MAINTENANCE: "maintenance",
  INSURANCE: "insurance",
  TAX: "tax",
  UTILITY: "utility",
  OTHER: "other"
} as const;

export const TRANSACTION_CATEGORY_LABELS: Record<string, string> = {
  [TRANSACTION_CATEGORIES.RENT]: "Loyer",
  [TRANSACTION_CATEGORIES.MAINTENANCE]: "Maintenance",
  [TRANSACTION_CATEGORIES.INSURANCE]: "Assurance",
  [TRANSACTION_CATEGORIES.TAX]: "Taxe",
  [TRANSACTION_CATEGORIES.UTILITY]: "Facture",
  [TRANSACTION_CATEGORIES.OTHER]: "Autre"
};

export const TRANSACTION_CATEGORY_COLORS: Record<string, string> = {
  [TRANSACTION_CATEGORIES.RENT]: "blue",
  [TRANSACTION_CATEGORIES.MAINTENANCE]: "orange",
  [TRANSACTION_CATEGORIES.INSURANCE]: "purple",
  [TRANSACTION_CATEGORIES.TAX]: "red",
  [TRANSACTION_CATEGORIES.UTILITY]: "green",
  [TRANSACTION_CATEGORIES.OTHER]: "gray"
}; 