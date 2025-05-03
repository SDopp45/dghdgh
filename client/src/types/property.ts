export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  livingArea: number;
  landArea: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  features: string[];
  images: string[];
  type: string;
  status: string;
  energyClass: string;
  createdAt: Date;
  updatedAt: Date;
} 