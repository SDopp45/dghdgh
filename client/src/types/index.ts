import type { Transaction as BaseTransaction, Property as BaseProperty } from "../../../shared/schema";

// Re-exporter Transaction pour qu'il soit disponible aux importations
export type Transaction = BaseTransaction;
export type Property = BaseProperty & {
  monthlyExpenses?: number;
};

export type PropertyInfo = {
  id: number;
  name: string;
} | null;

export type TenantInfo = {
  id: number;
  user?: { 
    fullName: string;
  };
} | null;

export interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  profileImage?: string;
  accountType?: string;
  settings?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  preferredAiModel?: string;
  storageUsed?: string | number;
  storageLimit?: string | number;
  storageTier?: string;
}

export interface FormattedTransaction {
  id: string | number;
  userId?: number;
  propertyId?: number | null;
  tenantId?: number | null;
  documentId?: number | null;
  documentIds?: number[];
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense' | 'credit';
  description: string;
  status?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  formattedDate: string;
  displayDate: string;
  formattedAmount: string;
  propertyName: string;
  tenantName: string;
  property: PropertyInfo;
  tenant: TenantInfo;
}

// Type pour les demandes de maintenance avec plusieurs documents
export interface FormattedMaintenanceRequest {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  propertyId: number;
  reportedBy?: string;
  totalCost?: number | string;
  documentId?: number | null;
  documentIds?: number[];  // Support pour les documents multiples
  createdAt: string;
  updatedAt: string;
  property?: PropertyInfo;
}