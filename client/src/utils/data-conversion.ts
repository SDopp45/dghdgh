/**
 * Utilitaire pour normaliser les propriétés reçues de l'API
 * Convertit les chaînes numériques en nombres et s'assure que tous les champs sont correctement typés
 */

import type { Property } from "@/lib/types";

/**
 * Convertit une propriété reçue de l'API en objet Property normalisé
 */
export function normalizeProperty(propertyData: any): Property {
  return {
    id: Number(propertyData.id),
    name: propertyData.name || "",
    address: propertyData.address || "",
    description: propertyData.description || undefined,
    type: propertyData.type || "house",
    status: propertyData.status || "available",
    
    // Convertir les valeurs numériques
    units: propertyData.units !== undefined ? Number(propertyData.units) : 0,
    rooms: propertyData.rooms !== undefined ? Number(propertyData.rooms) : 0,
    bedrooms: propertyData.bedrooms !== undefined ? Number(propertyData.bedrooms) : undefined,
    floors: propertyData.floors !== undefined ? Number(propertyData.floors) : undefined,
    bathrooms: propertyData.bathrooms !== undefined ? Number(propertyData.bathrooms) : undefined,
    toilets: propertyData.toilets !== undefined ? Number(propertyData.toilets) : undefined,
    livingArea: propertyData.living_area !== undefined ? Number(propertyData.living_area) : 
                propertyData.livingArea !== undefined ? Number(propertyData.livingArea) : 0,
    landArea: propertyData.land_area !== undefined ? Number(propertyData.land_area) : 
              propertyData.landArea !== undefined ? Number(propertyData.landArea) : undefined,
    area: propertyData.area !== undefined ? Number(propertyData.area) : undefined,
    
    // Convertir les booléens
    hasParking: propertyData.has_parking !== undefined ? Boolean(propertyData.has_parking) : 
                propertyData.hasParking !== undefined ? Boolean(propertyData.hasParking) : false,
    hasTerrace: propertyData.has_terrace !== undefined ? Boolean(propertyData.has_terrace) : 
                propertyData.hasTerrace !== undefined ? Boolean(propertyData.hasTerrace) : false,
    hasGarage: propertyData.has_garage !== undefined ? Boolean(propertyData.has_garage) : 
               propertyData.hasGarage !== undefined ? Boolean(propertyData.hasGarage) : false,
    hasOutbuilding: propertyData.has_outbuilding !== undefined ? Boolean(propertyData.has_outbuilding) : 
                    propertyData.hasOutbuilding !== undefined ? Boolean(propertyData.hasOutbuilding) : false,
    hasBalcony: propertyData.has_balcony !== undefined ? Boolean(propertyData.has_balcony) : 
                propertyData.hasBalcony !== undefined ? Boolean(propertyData.hasBalcony) : false,
    hasElevator: propertyData.has_elevator !== undefined ? Boolean(propertyData.has_elevator) : 
                 propertyData.hasElevator !== undefined ? Boolean(propertyData.hasElevator) : false,
    hasCellar: propertyData.has_cellar !== undefined ? Boolean(propertyData.has_cellar) : 
               propertyData.hasCellar !== undefined ? Boolean(propertyData.hasCellar) : false,
    hasGarden: propertyData.has_garden !== undefined ? Boolean(propertyData.has_garden) : 
               propertyData.hasGarden !== undefined ? Boolean(propertyData.hasGarden) : false,
    isNewConstruction: propertyData.is_new_construction !== undefined ? Boolean(propertyData.is_new_construction) : 
                        propertyData.isNewConstruction !== undefined ? Boolean(propertyData.isNewConstruction) : false,
    
    // Gérer le champ spécial isnewconstruction (en minuscules)
    isnewconstruction: propertyData.isnewconstruction !== undefined ? Boolean(propertyData.isnewconstruction) : undefined,
    
    // Valeurs financières
    purchasePrice: propertyData.purchase_price !== undefined ? Number(propertyData.purchase_price) : 
                   propertyData.purchasePrice !== undefined ? Number(propertyData.purchasePrice) : 0,
    monthlyRent: propertyData.monthly_rent !== undefined ? Number(propertyData.monthly_rent) : 
                 propertyData.monthlyRent !== undefined ? Number(propertyData.monthlyRent) : undefined,
    monthlyExpenses: propertyData.monthly_expenses !== undefined ? Number(propertyData.monthly_expenses) : 
                     propertyData.monthlyExpenses !== undefined ? Number(propertyData.monthlyExpenses) : undefined,
    loanAmount: propertyData.loan_amount !== undefined ? Number(propertyData.loan_amount) : 
                propertyData.loanAmount !== undefined ? Number(propertyData.loanAmount) : undefined,
    monthlyLoanPayment: propertyData.monthly_loan_payment !== undefined ? Number(propertyData.monthly_loan_payment) : 
                       propertyData.monthlyLoanPayment !== undefined ? Number(propertyData.monthlyLoanPayment) : undefined,
    loanDuration: propertyData.loan_duration !== undefined ? Number(propertyData.loan_duration) : 
                  propertyData.loanDuration !== undefined ? Number(propertyData.loanDuration) : undefined,
    
    // Autres valeurs
    energyClass: propertyData.energy_class || propertyData.energyClass || "D",
    energyEmissions: propertyData.energy_emissions || propertyData.energyEmissions || undefined,
    constructionYear: propertyData.construction_year !== undefined ? Number(propertyData.construction_year) : 
                      propertyData.constructionYear !== undefined ? Number(propertyData.constructionYear) : undefined,
    purchaseDate: propertyData.purchase_date || propertyData.purchaseDate || undefined,
    
    // Métadonnées
    createdAt: propertyData.created_at || propertyData.createdAt || new Date().toISOString(),
    updatedAt: propertyData.updated_at || propertyData.updatedAt || new Date().toISOString(),
    
    // ID utilisateur
    user_id: propertyData.user_id !== undefined ? Number(propertyData.user_id) : undefined,
    
    // Images
    images: Array.isArray(propertyData.images) ? propertyData.images : []
  };
}

/**
 * Convertit un tableau de propriétés reçues de l'API
 */
export function normalizeProperties(propertiesData: any[]): Property[] {
  if (!Array.isArray(propertiesData)) {
    console.error("Properties data is not an array", propertiesData);
    return [];
  }
  
  return propertiesData.map(normalizeProperty);
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "---";
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount) || numAmount === 0) return "---";
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

/**
 * Formate une date au format français
 */
export function formatDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
} 