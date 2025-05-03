export interface Visit {
  id: string;
  propertyId: string;
  date: string;
  type: 'inspection' | 'maintenance' | 'viewing';
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  tenantId?: string;
} 