export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  leaseStartDate: string;
  leaseEndDate: string;
  status: 'active' | 'inactive';
} 