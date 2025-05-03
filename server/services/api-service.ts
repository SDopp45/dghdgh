import axios from 'axios';
import logger from '../utils/logger';

// Types pour les réponses API
export interface ApiVisit {
  id: number;
  propertyId: number;
  userId?: number;
  datetime?: string;
  scheduledDate?: string;
  status: string;
  property?: {
    name: string;
    id: number;
  };
}

export interface ApiTransaction {
  id: number;
  amount: number | string;
  date: string;
  description?: string;
  type: string;
  propertyId?: number;
  property?: {
    name: string;
    id: number;
  };
}

export interface ApiProperty {
  id: number;
  name: string;
  address: string;
  status?: string;
}

export interface ApiTenant {
  id: number;
  propertyId: number;
  leaseStart?: string;
  leaseEnd?: string;
  active?: boolean;
  user?: {
    id: number;
    fullName?: string;
    email?: string;
  };
}

export interface ApiMaintenanceRequest {
  id: number;
  propertyId: number;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  property?: {
    name: string;
    id: number;
  };
}

// Configuration pour les appels API locaux
const API_BASE_URL = 'http://localhost:5005'; // Ajustez selon votre configuration

class ApiService {
  /**
   * Récupère toutes les visites
   */
  async getVisits(): Promise<ApiVisit[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/visits`);
      return response.data || [];
    } catch (error) {
      logger.error('Erreur lors de la récupération des visites:', error);
      return [];
    }
  }

  /**
   * Récupère une visite par son ID
   */
  async getVisitById(id: number): Promise<ApiVisit | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/visits/${id}`);
      return response.data || null;
    } catch (error) {
      logger.error(`Erreur lors de la récupération de la visite ${id}:`, error);
      return null;
    }
  }

  /**
   * Récupère les transactions avec filtrage optionnel
   */
  async getTransactions(type?: string): Promise<ApiTransaction[]> {
    try {
      const url = type 
        ? `${API_BASE_URL}/api/transactions?type=${type}`
        : `${API_BASE_URL}/api/transactions`;
        
      const response = await axios.get(url);
      return (response.data?.data || response.data || []);
    } catch (error) {
      logger.error('Erreur lors de la récupération des transactions:', error);
      return [];
    }
  }

  /**
   * Récupère une propriété par son ID
   */
  async getPropertyById(id: number): Promise<ApiProperty | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/properties/${id}`);
      return response.data || null;
    } catch (error) {
      logger.error(`Erreur lors de la récupération de la propriété ${id}:`, error);
      return null;
    }
  }

  /**
   * Récupère toutes les propriétés
   */
  async getProperties(): Promise<ApiProperty[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/properties`);
      return response.data || [];
    } catch (error) {
      logger.error('Erreur lors de la récupération des propriétés:', error);
      return [];
    }
  }

  /**
   * Récupère tous les locataires
   */
  async getTenants(): Promise<ApiTenant[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tenants`);
      return response.data || [];
    } catch (error) {
      logger.error('Erreur lors de la récupération des locataires:', error);
      return [];
    }
  }

  /**
   * Récupère un locataire par son ID
   */
  async getTenantById(id: number): Promise<ApiTenant | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tenants/${id}`);
      return response.data || null;
    } catch (error) {
      logger.error(`Erreur lors de la récupération du locataire ${id}:`, error);
      return null;
    }
  }

  /**
   * Récupère toutes les demandes de maintenance
   */
  async getMaintenanceRequests(): Promise<ApiMaintenanceRequest[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/maintenance`);
      return response.data || [];
    } catch (error) {
      logger.error('Erreur lors de la récupération des demandes de maintenance:', error);
      return [];
    }
  }
}

// Exporte une instance unique du service
export const apiService = new ApiService();
export default apiService; 