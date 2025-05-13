/**
 * Met à jour la taille du répertoire d'uploads d'un client spécifique
 * @param clientId - ID du client
 * @returns true si la mise à jour a réussi, false sinon
 */
export function updateClientUploadsSize(clientId: number): Promise<boolean>;

/**
 * Interface pour les détails de taille
 */
export interface SizeDetails {
  bytes: number;
  formatted: string;
}

/**
 * Interface pour les détails de stockage
 */
export interface StorageDetails {
  tables?: Array<{
    name: string;
    size: SizeDetails;
  }>;
  totalSize?: SizeDetails;
  documentsSize: SizeDetails;
  uploadsSize: SizeDetails;
  [key: string]: any;
}

/**
 * Obtient les détails de stockage pour un client spécifique
 * @param clientId - ID du client
 * @returns Détails du stockage
 */
export function getClientStorageDetails(clientId: number): Promise<StorageDetails | null>;

/**
 * Formate une taille en octets en format lisible
 * @param bytes - Taille en octets
 * @returns Taille formatée
 */
export function formatSize(bytes: number): string; 