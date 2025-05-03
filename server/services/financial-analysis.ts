import { db } from "../db";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { 
  properties, 
  transactions
} from "../../shared/schema";

import {
  financialEntries,
  propertyFinancialSnapshots,
  propertyFinancialGoals
} from "../../shared/financial-schema";
import { PropertyFinancialSnapshot } from "../../shared/financial-schema";
import logger from "../utils/logger";

const financialLogger = logger.child({ context: 'FinancialAnalysis' });

interface ROICalculationParams {
  propertyId: number;
  monthlyRent: number;
  purchasePrice: number;
  monthlyExpenses: number;
  propertyTaxRate: number;
  maintenanceReserve: number;
  vacancyRate: number;
  mortgageRate: number;
  downPayment: number;
  loanTerm: number;
  insuranceCost: number;
  propertyManagementFee: number;
  utilityExpenses: number;
  otherCharges: number;
  maintenanceCosts: number;
  repairBudget: number;
  renovationBudget: number;
}

interface ROIResults {
  cashFlow: number;
  monthlyFlow: number;
  cashOnCash: number;
  capRate: number;
  totalROI: number;
  netOperatingIncome: number;
  occupancyRate: number;
  grossRentalYield: number;
  netRentalYield: number;
  expenseBreakdown: {
    maintenance: number;
    renovation: number;
    insurance: number;
    propertyManagement: number;
    utilities: number;
    other: number;
  };
}

/**
 * Calcule le ROI et autres métriques financières pour une propriété
 */
export function calculateROI(params: ROICalculationParams): ROIResults {
  const annualRent = params.monthlyRent * 12;

  const annualCharges = {
    maintenance: (params.maintenanceCosts || 0) + (params.repairBudget || 0),
    renovation: params.renovationBudget || 0,
    insurance: params.insuranceCost * 12,
    propertyManagement: (params.monthlyRent * (params.propertyManagementFee / 100)) * 12,
    utilities: params.utilityExpenses * 12,
    other: params.otherCharges * 12,
  };

  const totalAnnualExpenses = Object.values(annualCharges).reduce((a, b) => a + b, 0);

  const vacancyReserve = (annualRent * params.vacancyRate) / 100;
  const maintenanceReserve = (annualRent * params.maintenanceReserve) / 100;
  const propertyTax = (params.purchasePrice * params.propertyTaxRate) / 100;

  const loanAmount = params.purchasePrice * (1 - params.downPayment / 100);
  const monthlyRate = params.mortgageRate / 12 / 100;
  const numberOfPayments = params.loanTerm * 12;
  const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  const annualMortgage = monthlyMortgage * 12;

  const totalInvestment = params.purchasePrice + annualCharges.renovation;

  const netOperatingIncome = annualRent - totalAnnualExpenses - vacancyReserve - maintenanceReserve - propertyTax;
  const cashFlow = netOperatingIncome - annualMortgage;

  const cashOnCash = ((cashFlow / (totalInvestment * params.downPayment / 100)) * 100);
  const capRate = ((netOperatingIncome / totalInvestment) * 100);
  const totalROI = ((netOperatingIncome / totalInvestment) * 100);
  
  // Calculs supplémentaires pour l'historisation
  const grossRentalYield = (annualRent / params.purchasePrice) * 100;
  const netRentalYield = (netOperatingIncome / params.purchasePrice) * 100;
  
  // Pour l'occupancyRate, nous utilisons le complément du taux de vacance
  const occupancyRate = 100 - params.vacancyRate;

  return {
    cashFlow,
    monthlyFlow: cashFlow / 12,
    cashOnCash: Number(cashOnCash.toFixed(2)),
    capRate: Number(capRate.toFixed(2)),
    totalROI: Number(totalROI.toFixed(2)),
    netOperatingIncome,
    grossRentalYield: Number(grossRentalYield.toFixed(2)),
    netRentalYield: Number(netRentalYield.toFixed(2)),
    occupancyRate,
    expenseBreakdown: annualCharges,
  };
}

/**
 * Récupère les données nécessaires au calcul du ROI pour une propriété
 */
export async function getPropertyFinancialData(propertyId: number) {
  const propertyData = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId)
  });

  if (!propertyData) {
    throw new Error(`Propriété avec ID ${propertyId} non trouvée`);
  }

  // Récupérer les coûts de maintenance
  const maintenanceCosts = await db.select({
    total: sql<number>`SUM(actual_cost)`
  }).from(transactions)
    .where(and(
      eq(transactions.propertyId, propertyId),
      eq(transactions.category, "maintenance"),
      eq(transactions.type, "expense")
    ));

  // Retourner les données formatées pour le calcul du ROI
  return {
    propertyId: propertyData.id,
    monthlyRent: Number(propertyData.monthlyRent),
    purchasePrice: Number(propertyData.purchasePrice),
    monthlyExpenses: Number(propertyData.monthlyExpenses || 0),
    propertyTaxRate: 1.2, // Valeur par défaut, à personnaliser
    maintenanceReserve: 5, // Valeur par défaut, à personnaliser
    vacancyRate: 5, // Valeur par défaut, à personnaliser
    mortgageRate: 3.5, // Valeur par défaut, à personnaliser
    downPayment: 20, // Valeur par défaut, à personnaliser
    loanTerm: 25, // Valeur par défaut, à personnaliser
    insuranceCost: 0, // À récupérer des transactions si disponible
    propertyManagementFee: 0, // À récupérer des paramètres utilisateur si disponible
    utilityExpenses: 0, // À récupérer des transactions si disponible
    otherCharges: 0, // À récupérer des transactions si disponible
    maintenanceCosts: maintenanceCosts[0]?.total || 0,
    repairBudget: 0, // À récupérer des paramètres utilisateur si disponible
    renovationBudget: 0, // À récupérer des paramètres utilisateur si disponible
  };
}

/**
 * Crée un instantané financier mensuel pour une propriété
 */
export async function createFinancialSnapshot(propertyId: number, date: Date = new Date()): Promise<PropertyFinancialSnapshot> {
  try {
    // Récupérer les données de la propriété
    const financialData = await getPropertyFinancialData(propertyId);
    
    // Calculer les métriques financières
    const roiData = calculateROI(financialData);

    // Créer l'instantané
    const snapshotDate = new Date(date.getFullYear(), date.getMonth(), 1); // Premier jour du mois
    
    // Préparation des données avec validation de type
    const snapshotData = {
      propertyId,
      snapshotDate: snapshotDate.toISOString().split('T')[0], // Format YYYY-MM-DD
      grossRentalYield: roiData.grossRentalYield.toFixed(2),
      netRentalYield: roiData.netRentalYield.toFixed(2),
      cashOnCashReturn: roiData.cashOnCash.toFixed(2),
      capRate: roiData.capRate.toFixed(2),
      monthlyCashFlow: roiData.monthlyFlow.toFixed(2),
      totalIncome: (financialData.monthlyRent * 12).toFixed(2),
      totalExpenses: Object.values(roiData.expenseBreakdown).reduce((a, b) => a + b, 0).toFixed(2),
      occupancyRate: roiData.occupancyRate.toFixed(2),
      metadata: {
        interestRate: financialData.mortgageRate,
        taxRate: financialData.propertyTaxRate,
        vacancyRate: financialData.vacancyRate
      }
    };
    
    const [snapshot] = await db.insert(propertyFinancialSnapshots).values(snapshotData).returning();

    financialLogger.info(`Instantané financier créé pour la propriété ${propertyId} à la date ${snapshotDate.toISOString()}`);
    
    return snapshot;
  } catch (error) {
    financialLogger.error(`Erreur lors de la création de l'instantané financier pour la propriété ${propertyId}:`, error);
    throw error;
  }
}

/**
 * Génère des instantanés mensuels pour toutes les propriétés
 * Fonction à exécuter via une tâche planifiée (cron)
 */
export async function generateMonthlySnapshots() {
  try {
    const now = new Date();
    const allProperties = await db.select({ id: properties.id }).from(properties);
    
    financialLogger.info(`Génération d'instantanés financiers pour ${allProperties.length} propriétés`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const property of allProperties) {
      try {
        await createFinancialSnapshot(property.id, now);
        successCount++;
      } catch (error) {
        errorCount++;
        financialLogger.error(`Erreur lors de la génération d'un instantané pour la propriété ${property.id}:`, error);
      }
    }
    
    financialLogger.info(`Génération d'instantanés terminée. Succès: ${successCount}, Échecs: ${errorCount}`);
    
    return { success: successCount, errors: errorCount };
  } catch (error) {
    financialLogger.error("Erreur lors de la génération des instantanés mensuels:", error);
    throw error;
  }
}

/**
 * Enregistre une entrée financière liée à un paiement de loyer
 */
export async function recordRentPayment(
  tenantId: number, 
  propertyId: number, 
  amount: number, 
  date: Date = new Date()
) {
  try {
    const [entry] = await db.insert(financialEntries).values({
      propertyId,
      date: date.toISOString(),
      type: 'income',
      category: 'Loyer',
      amount: amount.toString(),
      recurring: true,
      frequency: 'monthly',
      description: `Paiement de loyer`,
      source: 'rent',
      relatedEntityId: tenantId,
      relatedEntityType: 'tenant'
    }).returning();
    
    financialLogger.info(`Paiement de loyer enregistré pour la propriété ${propertyId} (locataire ${tenantId}): ${amount}€`);
    
    return entry;
  } catch (error) {
    financialLogger.error(`Erreur lors de l'enregistrement du paiement de loyer:`, error);
    throw error;
  }
}

/**
 * Enregistre une entrée financière liée à des travaux de maintenance
 */
export async function recordMaintenanceExpense(
  maintenanceId: number, 
  propertyId: number, 
  amount: number, 
  date: Date = new Date()
) {
  try {
    const [entry] = await db.insert(financialEntries).values({
      propertyId,
      date: date.toISOString(),
      type: 'expense',
      category: 'Maintenance',
      amount: amount.toString(),
      recurring: false,
      description: `Travaux de maintenance`,
      source: 'maintenance',
      relatedEntityId: maintenanceId,
      relatedEntityType: 'maintenance'
    }).returning();
    
    financialLogger.info(`Dépense de maintenance enregistrée pour la propriété ${propertyId}: ${amount}€`);
    
    return entry;
  } catch (error) {
    financialLogger.error(`Erreur lors de l'enregistrement de la dépense de maintenance:`, error);
    throw error;
  }
}

/**
 * Récupère l'historique des instantanés financiers d'une propriété
 */
export async function getFinancialHistory(propertyId: number, months: number = 12) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const snapshots = await db.select()
      .from(propertyFinancialSnapshots)
      .where(and(
        eq(propertyFinancialSnapshots.propertyId, propertyId),
        gte(propertyFinancialSnapshots.snapshotDate, startDate.toISOString())
      ))
      .orderBy(propertyFinancialSnapshots.snapshotDate);
    
    return snapshots;
  } catch (error) {
    financialLogger.error(`Erreur lors de la récupération de l'historique financier pour la propriété ${propertyId}:`, error);
    throw error;
  }
}

/**
 * Crée ou met à jour un objectif financier pour une propriété
 */
export async function setFinancialGoal(
  propertyId: number, 
  title: string,
  type: 'roi' | 'cashflow' | 'occupancy_rate' | 'expense_reduction', 
  targetValue: number,
  deadline?: Date,
  notes?: string
) {
  try {
    // Vérifier si un objectif similaire existe déjà
    const existingGoal = await db.query.propertyFinancialGoals.findFirst({
      where: and(
        eq(propertyFinancialGoals.propertyId, propertyId),
        eq(propertyFinancialGoals.type, type)
      )
    });
    
    // Récupérer la valeur actuelle
    const financialData = await getPropertyFinancialData(propertyId);
    const roiData = calculateROI(financialData);
    
    let currentValue: number;
    switch (type) {
      case 'roi':
        currentValue = roiData.totalROI;
        break;
      case 'cashflow':
        currentValue = roiData.monthlyFlow;
        break;
      case 'occupancy_rate':
        currentValue = roiData.occupancyRate;
        break;
      case 'expense_reduction':
        currentValue = Object.values(roiData.expenseBreakdown).reduce((a, b) => a + b, 0);
        break;
    }
    
    // Déterminer le statut initial
    let status: 'pending' | 'in_progress' | 'achieved' | 'missed' = 'pending';
    
    if (type === 'expense_reduction') {
      // Pour la réduction des dépenses, l'objectif est atteint si currentValue ≤ targetValue
      status = currentValue <= targetValue ? 'achieved' : 'in_progress';
    } else {
      // Pour les autres types, l'objectif est atteint si currentValue ≥ targetValue
      status = currentValue >= targetValue ? 'achieved' : 'in_progress';
    }
    
    if (existingGoal) {
      // Mise à jour de l'objectif existant
      const [updatedGoal] = await db.update(propertyFinancialGoals)
        .set({
          title,
          targetValue: targetValue.toString(),
          currentValue: currentValue.toString(),
          deadline: deadline?.toISOString(),
          notes,
          status,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(propertyFinancialGoals.id, existingGoal.id))
        .returning();
      
      financialLogger.info(`Objectif financier mis à jour pour la propriété ${propertyId}: ${title}`);
      
      return updatedGoal;
    } else {
      // Création d'un nouvel objectif
      const [newGoal] = await db.insert(propertyFinancialGoals)
        .values({
          propertyId,
          title,
          type,
          targetValue: targetValue.toString(),
          currentValue: currentValue.toString(),
          deadline: deadline?.toISOString(),
          notes,
          status
        })
        .returning();
      
      financialLogger.info(`Nouvel objectif financier créé pour la propriété ${propertyId}: ${title}`);
      
      return newGoal;
    }
  } catch (error) {
    financialLogger.error(`Erreur lors de la définition d'un objectif financier pour la propriété ${propertyId}:`, error);
    throw error;
  }
}

/**
 * Mise à jour du statut des objectifs financiers
 * À exécuter après la génération des instantanés mensuels
 */
export async function updateFinancialGoals() {
  try {
    const goals = await db.query.propertyFinancialGoals.findMany({
      where: and(
        sql`status != 'achieved'`,
        sql`status != 'missed'`
      )
    });
    
    let updatedCount = 0;
    
    for (const goal of goals) {
      try {
        // Vérifier si la date limite est dépassée
        if (goal.deadline && new Date() > new Date(goal.deadline)) {
          await db.update(propertyFinancialGoals)
            .set({ 
              status: 'missed', 
              updatedAt: sql`CURRENT_TIMESTAMP` 
            })
            .where(eq(propertyFinancialGoals.id, goal.id));
          
          updatedCount++;
          continue;
        }
        
        // Récupérer les données actuelles
        const financialData = await getPropertyFinancialData(goal.propertyId);
        const roiData = calculateROI(financialData);
        
        let currentValue: number;
        switch (goal.type) {
          case 'roi':
            currentValue = roiData.totalROI;
            break;
          case 'cashflow':
            currentValue = roiData.monthlyFlow;
            break;
          case 'occupancy_rate':
            currentValue = roiData.occupancyRate;
            break;
          case 'expense_reduction':
            currentValue = Object.values(roiData.expenseBreakdown).reduce((a, b) => a + b, 0);
            break;
        }
        
        // Déterminer le nouveau statut
        let newStatus = goal.status;
        
        if (goal.type === 'expense_reduction') {
          // Pour la réduction des dépenses, l'objectif est atteint si currentValue ≤ targetValue
          if (currentValue <= Number(goal.targetValue)) {
            newStatus = 'achieved';
          }
        } else {
          // Pour les autres types, l'objectif est atteint si currentValue ≥ targetValue
          if (currentValue >= Number(goal.targetValue)) {
            newStatus = 'achieved';
          }
        }
        
        if (newStatus !== goal.status || currentValue !== Number(goal.currentValue || 0)) {
          await db.update(propertyFinancialGoals)
            .set({ 
              status: newStatus, 
              currentValue: currentValue.toString(), 
              updatedAt: sql`CURRENT_TIMESTAMP` 
            })
            .where(eq(propertyFinancialGoals.id, goal.id));
          
          updatedCount++;
        }
      } catch (error) {
        financialLogger.error(`Erreur lors de la mise à jour de l'objectif ${goal.id}:`, error);
      }
    }
    
    financialLogger.info(`Mise à jour des objectifs financiers terminée. ${updatedCount} objectifs mis à jour.`);
    
    return { updated: updatedCount };
  } catch (error) {
    financialLogger.error(`Erreur lors de la mise à jour des objectifs financiers:`, error);
    throw error;
  }
}

/**
 * Récupère les indicateurs agrégés pour le tableau de bord
 */
export async function getFinancialOverview() {
  try {
    // Récupérer le nombre total de propriétés
    const propertiesCount = await db.select({ count: sql<number>`count(*)` })
      .from(properties)
      .then(res => Number(res[0].count));
    
    if (propertiesCount === 0) {
      return {
        averageROI: 0,
        averageCashFlow: 0,
        totalMonthlyIncome: 0,
        totalMonthlyExpenses: 0,
        bestPerformingProperty: null,
        worstPerformingProperty: null,
        recentSnapshots: []
      };
    }
    
    // Récupérer les snapshots les plus récents pour chaque propriété
    const latestSnapshots = await db.select()
      .from(propertyFinancialSnapshots)
      .orderBy(desc(propertyFinancialSnapshots.snapshotDate))
      .limit(propertiesCount * 2); // Pour s'assurer d'avoir au moins un snapshot par propriété
    
    // Filtrer pour n'avoir que le dernier snapshot par propriété
    const uniquePropertyIds = new Set<number>();
    const recentSnapshots = latestSnapshots.filter(snapshot => {
      if (uniquePropertyIds.has(snapshot.propertyId)) {
        return false;
      }
      uniquePropertyIds.add(snapshot.propertyId);
      return true;
    });
    
    // Calculer les moyennes
    const averageROI = recentSnapshots.reduce((sum, snap) => sum + Number(snap.cashOnCashReturn || 0), 0) / recentSnapshots.length;
    const averageCashFlow = recentSnapshots.reduce((sum, snap) => sum + Number(snap.monthlyCashFlow || 0), 0) / recentSnapshots.length;
    const totalMonthlyIncome = recentSnapshots.reduce((sum, snap) => sum + Number(snap.totalIncome || 0) / 12, 0);
    const totalMonthlyExpenses = recentSnapshots.reduce((sum, snap) => sum + Number(snap.totalExpenses || 0) / 12, 0);
    
    // Trouver les propriétés les plus et moins performantes
    let bestIndex = 0;
    let worstIndex = 0;
    
    for (let i = 1; i < recentSnapshots.length; i++) {
      if (Number(recentSnapshots[i].cashOnCashReturn) > Number(recentSnapshots[bestIndex].cashOnCashReturn)) {
        bestIndex = i;
      }
      if (Number(recentSnapshots[i].cashOnCashReturn) < Number(recentSnapshots[worstIndex].cashOnCashReturn)) {
        worstIndex = i;
      }
    }
    
    // Récupérer les détails des propriétés les plus et moins performantes
    const bestPropertyId = recentSnapshots[bestIndex]?.propertyId;
    const worstPropertyId = recentSnapshots[worstIndex]?.propertyId;
    
    const [bestProperty, worstProperty] = await Promise.all([
      bestPropertyId ? db.query.properties.findFirst({
        where: eq(properties.id, bestPropertyId)
      }) : null,
      worstPropertyId ? db.query.properties.findFirst({
        where: eq(properties.id, worstPropertyId)
      }) : null
    ]);
    
    return {
      averageROI: Number(averageROI.toFixed(2)),
      averageCashFlow: Number(averageCashFlow.toFixed(2)),
      totalMonthlyIncome: Number(totalMonthlyIncome.toFixed(2)),
      totalMonthlyExpenses: Number(totalMonthlyExpenses.toFixed(2)),
      bestPerformingProperty: bestProperty ? {
        id: bestProperty.id,
        name: bestProperty.name,
        roi: recentSnapshots[bestIndex].cashOnCashReturn,
        cashFlow: recentSnapshots[bestIndex].monthlyCashFlow
      } : null,
      worstPerformingProperty: worstProperty ? {
        id: worstProperty.id,
        name: worstProperty.name,
        roi: recentSnapshots[worstIndex].cashOnCashReturn,
        cashFlow: recentSnapshots[worstIndex].monthlyCashFlow
      } : null,
      recentSnapshots: recentSnapshots.slice(0, 5)
    };
  } catch (error) {
    financialLogger.error(`Erreur lors de la récupération des indicateurs financiers:`, error);
    throw error;
  }
}