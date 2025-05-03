import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface TransactionData {
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
  property?: any;
  tenant?: any;
  propertyName?: string;
  tenantName?: string;
  formattedDate?: string;
  displayDate?: string;
  formattedAmount?: string;
  
  // Champs spécifiques pour les types credit (peuvent ne pas être présents dans l'API)
  dueDate?: string;
  remainingAmount?: number;
  totalAmount?: number;
  interestRate?: number;
  monthlyPayment?: number;
  endDate?: string;
}

export function useTransactions() {
  return useQuery<TransactionData[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/transactions');
        
        console.log('Réponse API brute:', response);
        
        // Extraire les données selon la structure de réponse
        let responseData;
        
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          // Format { data: [...transactions], meta: {...} }
          responseData = response.data.data;
          console.log('Format de réponse détecté: { data: [...], meta: ... }');
        } else if (response.data && Array.isArray(response.data)) {
          // Format [...transactions]
          responseData = response.data;
          console.log('Format de réponse détecté: [...]');
        } else if (response.data && typeof response.data === 'object') {
          // Format { transactions: [...] } ou autre structure
          const possibleArrayField = Object.values(response.data).find(value => Array.isArray(value));
          if (possibleArrayField) {
            responseData = possibleArrayField;
            console.log('Format de réponse détecté: { somefield: [...] }');
          } else {
            console.log('Format de réponse non reconnu, retournant un tableau vide');
            return [];
          }
        } else {
          console.log('Format de réponse invalide, retournant un tableau vide');
          return [];
        }
        
        console.log('Données extraites de la réponse:', responseData);
        
        if (responseData && responseData.length > 0) {
          console.log('✅ Données API trouvées, utilisation des données réelles');
          
          // Fonction d'analyse des statuts bruts pour débogage
          const analyzeRawStatuses = (data: any[]) => {
            const statuses: Record<string, number> = {};
            data.forEach((item: any) => {
              const status = String(item.status || 'undefined').toLowerCase();
              statuses[status] = (statuses[status] || 0) + 1;
            });
            console.log('Statuts bruts des transactions:', statuses);
            
            // Vérifier les statuts ambigus
            const pendingLike = data.filter((item: any) => {
              const status = String(item.status || '').toLowerCase();
              return status.includes('pend') || status.includes('atten') || status.includes('wait') || status === 'active';
            });
            console.log(`Transactions potentiellement "en attente" (raw): ${pendingLike.length}`);
            
            const completedLike = data.filter((item: any) => {
              const status = String(item.status || '').toLowerCase();
              return status.includes('compl') || status.includes('term') || status.includes('done') || status.includes('finish');
            });
            console.log(`Transactions potentiellement "complétées" (raw): ${completedLike.length}`);
          };
          
          // Analyser les statuts bruts
          analyzeRawStatuses(responseData);
          
          // Valider et normaliser les transactions
          const normalizedTransactions = responseData.map((t: any) => {
            // Vérifier les champs requis
            if (!t.id || t.amount === undefined || !t.date) {
              console.warn('Transaction invalide, champs requis manquants:', t);
              return null;
            }
            
            // Normaliser le type
            let normalizedType = String(t.type || '').toLowerCase();
            
            // Mapper les types potentiellement différents
            if (normalizedType === 'depense' || normalizedType === 'dépense') normalizedType = 'expense';
            if (normalizedType === 'crédit' || normalizedType === 'loan') normalizedType = 'credit';
            
            // S'assurer que le type est valide
            if (!['income', 'expense', 'credit'].includes(normalizedType)) {
              console.warn(`Type de transaction invalide: ${normalizedType}, transaction:`, t);
              normalizedType = t.amount > 0 ? 'income' : 'expense'; // Assignation par défaut basée sur le montant
            }
            
            // Normaliser le statut
            let normalizedStatus = String(t.status || '').toLowerCase();
            
            // Débogage du statut original avant normalisation
            console.log(`Transaction ${t.id}: statut original="${t.status}", type="${t.type}"`);
            
            // Vérifier si le statut est undefined ou null
            if (t.status === undefined || t.status === null || normalizedStatus === '') {
              // Si le statut est manquant, on considère les revenus et crédits comme "pending",
              // et les dépenses comme "completed" par défaut
              if (t.type === 'income' || t.type === 'credit') {
                normalizedStatus = 'pending';
              } else {
                normalizedStatus = 'completed';
              }
              console.log(`Transaction ${t.id}: statut manquant, défini comme "${normalizedStatus}" par défaut (basé sur le type)`);
            }
            // Simplification: ne traiter que les statuts "pending" ou "completed"
            else if (normalizedStatus.includes('compl') || normalizedStatus.includes('term') || 
                    normalizedStatus.includes('done') || normalizedStatus.includes('finish')) {
              normalizedStatus = 'completed';
            } 
            else if (normalizedStatus === 'pending' || normalizedStatus.includes('atten') ||
                    normalizedStatus.includes('wait') || normalizedStatus.includes('cours') || 
                    normalizedStatus.includes('activ')) {
              normalizedStatus = 'pending';
            } 
            else {
              // Si le statut est inconnu, on considère par défaut comme "completed"
              normalizedStatus = 'completed';
              console.log(`Transaction ${t.id}: statut inconnu "${t.status}", défini comme "completed" par défaut`);
            }
            
            // Vérification après normalisation
            console.log(`Transaction ${t.id}: statut normalisé="${normalizedStatus}"`);
            
            // Normaliser la date
            let normalizedDate;
            try {
              normalizedDate = new Date(t.date);
              if (isNaN(normalizedDate.getTime())) {
                console.warn(`Date invalide pour la transaction ${t.id}:`, t.date);
                normalizedDate = new Date(); // Date par défaut
              }
            } catch (e) {
              console.warn(`Erreur lors du parsing de la date pour la transaction ${t.id}:`, t.date);
              normalizedDate = new Date(); // Date par défaut
            }
            
            // Normaliser le montant
            const normalizedAmount = typeof t.amount === 'number' 
              ? t.amount 
              : parseFloat(String(t.amount).replace(/[^\d.-]/g, ''));
            
            if (isNaN(normalizedAmount)) {
              console.warn(`Montant invalide pour la transaction ${t.id}:`, t.amount);
              return null;
            }
            
            // Construire la transaction normalisée
            return {
              ...t,
              type: normalizedType,
              status: normalizedStatus,
              amount: normalizedAmount,
              date: normalizedDate.toISOString(),
              category: t.category || 'Non catégorisé',
              description: t.description || '',
              
              // Gestion spécifique aux crédits
              ...(normalizedType === 'credit' && {
                // S'assurer que les propriétés de crédit sont présentes
                monthlyPayment: t.monthlyPayment !== undefined ? t.monthlyPayment : 
                                t.amount ? Math.round(t.amount * 0.05 * 100) / 100 : 0,  // Estimation: 5% du montant total
                remainingAmount: t.remainingAmount !== undefined ? t.remainingAmount : 
                                t.amount || 0,  // Par défaut, le montant total restant est le montant initial
                interestRate: t.interestRate !== undefined ? t.interestRate : 3.5, // Taux par défaut
                dueDate: t.dueDate || new Date(normalizedDate.getFullYear() + 5, normalizedDate.getMonth(), normalizedDate.getDate()).toISOString(), // Par défaut: 5 ans
                totalAmount: t.totalAmount || t.amount || 0
              }),
              
              // Champs utiles pour l'affichage
              formattedDate: normalizedDate.toLocaleDateString('fr-FR'),
              displayDate: normalizedDate.toLocaleDateString('fr-FR'),
              formattedAmount: new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
              }).format(normalizedAmount)
            };
          }).filter((t: any) => t !== null);
          
          // Fonction d'analyse des transactions normalisées (débogage)
          const analyzeTransactions = (transactions: TransactionData[]) => {
            if (!transactions || !Array.isArray(transactions)) {
              console.error('Erreur: transactions n\'est pas un tableau ou est undefined', transactions);
              return;
            }
          
            console.log(`Nombre total de transactions normalisées: ${transactions.length}`);
          
            // Analyser les statuts
            const statuses: Record<string, number> = {};
            transactions.forEach(t => {
              const status = (t.status || 'unknown').toLowerCase();
              statuses[status] = (statuses[status] || 0) + 1;
            });
            console.log('Analyse des statuts normalisés:', statuses);
          
            // Analyser les types
            const types: Record<string, number> = {};
            transactions.forEach(t => {
              const type = (t.type || 'unknown').toLowerCase();
              types[type] = (types[type] || 0) + 1;
            });
            console.log('Analyse des types normalisés:', types);
          
            // Vérifier les statuts "en attente" et "complétées"
            const pendingTransactions = transactions.filter(t => t.status === 'pending');
            console.log(`Transactions en attente (normalisées): ${pendingTransactions.length}`);
            
            const completedTransactions = transactions.filter(t => t.status === 'completed');
            console.log(`Transactions complétées (normalisées): ${completedTransactions.length}`);
            
            // Analyse spécifique des crédits
            const credits = transactions.filter(t => t.type === 'credit');
            console.log(`Transactions de type crédit: ${credits.length}`);
            
            if (credits.length > 0) {
              console.log('--- DÉTAILS DES CRÉDITS ---');
              let countWithMonthlyPayment = 0;
              let countWithRemainingAmount = 0;
              let totalMonthlyPayments = 0;
              let totalRemainingAmount = 0;
              
              credits.forEach((credit, index) => {
                console.log(`Crédit #${index + 1} (ID: ${credit.id}):`);
                console.log(`  Type: ${credit.type}, Status: ${credit.status}`);
                console.log(`  Montant: ${credit.amount}, Catégorie: ${credit.category}`);
                console.log(`  Montant restant: ${credit.remainingAmount !== undefined ? credit.remainingAmount : 'non défini'}`);
                console.log(`  Paiement mensuel: ${credit.monthlyPayment !== undefined ? credit.monthlyPayment : 'non défini'}`);
                
                if (credit.monthlyPayment !== undefined && credit.monthlyPayment !== null) {
                  countWithMonthlyPayment++;
                  totalMonthlyPayments += credit.monthlyPayment;
                }
                
                if (credit.remainingAmount !== undefined && credit.remainingAmount !== null) {
                  const remainingAmount = Number(credit.remainingAmount);
                  if (!isNaN(remainingAmount)) {
                    countWithRemainingAmount++;
                    totalRemainingAmount += remainingAmount;
                  } else {
                    console.warn(`Montant restant invalide pour le crédit ${credit.id}:`, credit.remainingAmount);
                  }
                }
              });
              
              console.log(`Crédits avec paiement mensuel: ${countWithMonthlyPayment}/${credits.length}`);
              console.log(`Crédits avec montant restant: ${countWithRemainingAmount}/${credits.length}`);
              console.log(`Total des paiements mensuels: ${totalMonthlyPayments.toFixed(2)}€`);
              console.log(`Total des montants restants: ${totalRemainingAmount.toFixed(2)}€`);
            }
            
            // Vérifier la distribution par mois
            const currentYear = new Date().getFullYear();
            const monthlyDistribution = Array(12).fill(0).map(() => ({ total: 0, pending: 0, completed: 0 }));
            
            transactions.forEach(t => {
              try {
                const date = new Date(t.date);
                if (date.getFullYear() === currentYear) {
                  const month = date.getMonth();
                  monthlyDistribution[month].total++;
                  if (t.status === 'pending') {
                    monthlyDistribution[month].pending++;
                  } else if (t.status === 'completed') {
                    monthlyDistribution[month].completed++;
                  }
                }
              } catch (e) {
                // Ignorer les erreurs de parsing de date
              }
            });
            
            console.log('Distribution mensuelle des transactions (année courante):', monthlyDistribution);
          };
          
          // Analyser les transactions normalisées
          analyzeTransactions(normalizedTransactions);
          
          console.log('Transactions normalisées:', normalizedTransactions);
          
          return normalizedTransactions;
        } else {
          console.log('❌ Aucune donnée API, retournant un tableau vide');
          return [];
        }
      } catch (error) {
        console.error('Erreur lors du chargement des transactions:', error);
        
        // En cas d'erreur, retourner un tableau vide
        console.log('Erreur de chargement des transactions, retournant un tableau vide');
        return [];
      }
    },
    // Configuration du cache
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}

// Fonction utilitaire pour formater les montants en euros
export function formatEuro(amount: number | string | null | undefined) {
  try {
    // Convertir en nombre si ce n'est pas déjà le cas
    let numericAmount: number;
    
    if (typeof amount === 'string') {
      // Nettoyer la chaîne de caractères
      const cleanedAmount = amount.replace(/[^\d.-]/g, '');
      numericAmount = parseFloat(cleanedAmount);
    } else {
      numericAmount = Number(amount);
    }
    
    // Vérifier si c'est un nombre valide
    if (isNaN(numericAmount)) {
      console.warn('Montant invalide détecté:', amount);
      return '0,00 €';
    }
    
    // Formater avec Intl.NumberFormat
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  } catch (error) {
    console.error('Erreur lors du formatage du montant:', error);
    return '0,00 €';
  }
}

// Fonctions utilitaires pour le filtrage des transactions
export function filterTransactionsByDate(transactions: TransactionData[], period: 'today' | 'thisMonth' | 'thisYear' | 'all' = 'all') {
  const now = new Date();
  
  return transactions.filter(t => {
    // Gérer les formats de date différents
    let transactionDate: Date;
    try {
      // Essayer de parser la date au format ISO
      transactionDate = new Date(t.date);
      
      // Vérifier si la date est valide
      if (isNaN(transactionDate.getTime())) {
        console.warn(`Date invalide pour la transaction ${t.id}:`, t.date);
        return false;
      }
    } catch (e) {
      console.warn(`Erreur lors du parsing de la date pour la transaction ${t.id}:`, t.date);
      return false;
    }
    
    const sameDay = 
      transactionDate.getDate() === now.getDate() &&
      transactionDate.getMonth() === now.getMonth() &&
      transactionDate.getFullYear() === now.getFullYear();
      
    const sameMonth = 
      transactionDate.getMonth() === now.getMonth() &&
      transactionDate.getFullYear() === now.getFullYear();
      
    const sameYear = transactionDate.getFullYear() === now.getFullYear();
    
    switch (period) {
      case 'today':
        return sameDay;
      case 'thisMonth':
        return sameMonth;
      case 'thisYear':
        return sameYear;
      case 'all':
      default:
        return true;
    }
  });
}

// Fonction utilitaire pour calculer les revenus
export function calculateIncome(transactions: TransactionData[], period: 'today' | 'thisMonth' | 'thisYear' | 'all' = 'thisMonth') {
  return filterTransactionsByDate(transactions, period)
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

// Fonction utilitaire pour calculer les dépenses
export function calculateExpenses(transactions: TransactionData[], period: 'today' | 'thisMonth' | 'thisYear' | 'all' = 'thisMonth') {
  return filterTransactionsByDate(transactions, period)
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

// Fonction utilitaire pour calculer la balance
export function calculateBalance(transactions: TransactionData[], period: 'today' | 'thisMonth' | 'thisYear' | 'all' = 'thisMonth') {
  const income = calculateIncome(transactions, period);
  const expenses = calculateExpenses(transactions, period);
  return income - expenses;
}

// Fonction utilitaire pour grouper les transactions par catégorie
export function groupByCategory(transactions: TransactionData[], type: 'income' | 'expense', period: 'today' | 'thisMonth' | 'thisYear' | 'all' = 'thisMonth') {
  return filterTransactionsByDate(transactions, period)
    .filter(t => t.type === type)
    .reduce((acc: Record<string, number>, t) => {
      if (!acc[t.category]) {
        acc[t.category] = 0;
      }
      acc[t.category] += t.amount;
      return acc;
    }, {});
}

// Fonction pour récupérer tous les crédits d'une liste de transactions
export function getCredits(transactions: TransactionData[]) {
  const credits = transactions.filter(t => t.type === 'credit');
  console.log(`${credits.length} crédits trouvés dans ${transactions.length} transactions`);
  return credits;
}

// Fonction pour récupérer les crédits en attente ou actifs
export function getPendingCredits(transactions: TransactionData[]) {
  const credits = getCredits(transactions);
  const pendingCredits = credits.filter(credit => 
    credit.status === 'pending' || 
    credit.status === 'active' || 
    (credit.status !== 'cancelled' && credit.status !== 'completed')
  );
  console.log(`${pendingCredits.length} crédits en attente trouvés`);
  return pendingCredits;
}

// Fonction pour récupérer les crédits terminés
export function getCompletedCredits(transactions: TransactionData[]) {
  const credits = getCredits(transactions);
  const completedCredits = credits.filter(credit => credit.status === 'completed');
  console.log(`${completedCredits.length} crédits terminés trouvés`);
  return completedCredits;
}

// Fonction pour récupérer les crédits annulés
export function getCancelledCredits(transactions: TransactionData[]) {
  const credits = getCredits(transactions);
  const cancelledCredits = credits.filter(credit => credit.status === 'cancelled');
  console.log(`${cancelledCredits.length} crédits annulés trouvés`);
  return cancelledCredits;
}

// Fonction pour calculer le montant total des crédits
export function getTotalCreditAmount(transactions: TransactionData[]) {
  const credits = getCredits(transactions);
  return credits.reduce((sum, credit) => sum + credit.amount, 0);
}

// Fonction utilitaire pour calculer le montant total restant des crédits
export function getTotalRemainingCreditAmount(transactions: TransactionData[]) {
  return getCredits(transactions)
    .reduce((sum, t) => sum + (t.remainingAmount || 0), 0);
}

// Fonction utilitaire pour calculer le montant total des paiements mensuels
export function getTotalMonthlyPayments(transactions: TransactionData[]) {
  return getCredits(transactions)
    .reduce((sum, t) => sum + (t.monthlyPayment || 0), 0);
} 