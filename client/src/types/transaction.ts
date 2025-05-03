export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  propertyId: string;
  tenantId: string;
  status: 'pending' | 'completed' | 'cancelled';
  documentIds: string[];
  formattedDate?: string;
  formattedAmount?: string;
  property?: {
    id: string;
    name: string;
  };
  tenant?: {
    id: string;
    user: {
      id: string;
      name: string;
    };
  };
} 