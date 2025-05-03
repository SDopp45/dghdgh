import type { z } from 'zod';

export type PropertyType = 'apartment' | 'house' | 'commercial' | 'parking' | 'garage' | 'land' | 'office' | 'building' | 'storage';
export type PropertyStatus = 'available' | 'rented' | 'maintenance' | 'sold';
export type EnergyClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface PropertyImage {
  id: number;
  propertyId: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Property {
  id: number;
  name: string;
  description?: string;
  address: string;
  type: string;
  status: 'available' | 'rented' | 'maintenance' | 'sold';
  purchasePrice?: number;
  monthlyRent?: number;
  monthlyExpenses?: number;
  loanAmount?: number;
  loanDuration?: number;
  monthlyLoanPayment?: number;
  energyClass: string;
  energyEmissions?: string;
  livingArea?: number;
  landArea?: number;
  area?: number;
  units?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  toilets?: number;
  floors?: number;
  constructionYear?: number;
  purchaseDate?: string;  // Date d'acquisition au format ISO 8601 (YYYY-MM-DD)
  hasParking?: boolean;
  hasGarage?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasCellar?: boolean;
  hasGarden?: boolean;
  hasOutbuilding?: boolean;
  isNewConstruction?: boolean;
  images?: Array<{ filename: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormValues {
  name: string;
  address: string;
  description?: string;
  type: PropertyType;
  status: PropertyStatus;
  units: number;
  rooms: number;
  bedrooms: number;
  floors: number;
  bathrooms: number;
  toilets: number;
  energyClass: EnergyClass;
  energyEmissions: EnergyClass;
  livingArea: number;
  landArea?: number;
  hasParking: boolean;
  hasTerrace: boolean;
  hasGarage: boolean;
  hasOutbuilding: boolean;
  purchasePrice: number;
  monthlyRent?: number;
  monthlyExpenses?: number;
  loanAmount?: number;
  monthlyLoanPayment?: number;
  loanDuration?: number;
  constructionYear?: number;
  area: number;
  acquisitionDate?: string;
  images?: PropertyImage[];
  coordinates?: Coordinates;
  createPurchaseTransaction?: boolean;
  createLoanTransactions?: boolean;
}