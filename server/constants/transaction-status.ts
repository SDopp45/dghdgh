export const TRANSACTION_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
  ARCHIVED: "archived",
  DELETED: "deleted"
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  [TRANSACTION_STATUS.PENDING]: "En attente",
  [TRANSACTION_STATUS.COMPLETED]: "Complétée",
  [TRANSACTION_STATUS.CANCELLED]: "Annulée",
  [TRANSACTION_STATUS.FAILED]: "Échouée",
  [TRANSACTION_STATUS.ARCHIVED]: "Archivée",
  [TRANSACTION_STATUS.DELETED]: "Supprimée"
};

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  [TRANSACTION_STATUS.PENDING]: "yellow",
  [TRANSACTION_STATUS.COMPLETED]: "green",
  [TRANSACTION_STATUS.CANCELLED]: "red",
  [TRANSACTION_STATUS.FAILED]: "red",
  [TRANSACTION_STATUS.ARCHIVED]: "gray",
  [TRANSACTION_STATUS.DELETED]: "gray"
}; 