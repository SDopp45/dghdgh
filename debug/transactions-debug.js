// Script de débogage pour analyser les transactions
console.log('====== DÉBUT DU SCRIPT DE DÉBOGAGE ======');

// Fonction qui sera injectée dans le hook useTransactions
function analyzeTransactions(transactions) {
  if (!transactions || !Array.isArray(transactions)) {
    console.error('Erreur: transactions n\'est pas un tableau ou est undefined', transactions);
    return;
  }

  console.log(`Nombre total de transactions: ${transactions.length}`);

  // Analyser les statuts
  const statuses = {};
  transactions.forEach(t => {
    const status = (t.status || 'unknown').toLowerCase();
    statuses[status] = (statuses[status] || 0) + 1;
  });
  console.log('Analyse des statuts:', statuses);

  // Analyser les types
  const types = {};
  transactions.forEach(t => {
    const type = (t.type || 'unknown').toLowerCase();
    types[type] = (types[type] || 0) + 1;
  });
  console.log('Analyse des types:', types);

  // Vérifier les statuts "en attente" et "complétées"
  const pendingTransactions = transactions.filter(t => {
    const status = (t.status || '').toLowerCase();
    return status === 'pending' || status === 'active' || status === 'en attente' || status === 'en_attente';
  });
  console.log(`Transactions en attente: ${pendingTransactions.length}`);
  if (pendingTransactions.length > 0) {
    console.log('Exemple de transaction en attente:', pendingTransactions[0]);
  }

  const completedTransactions = transactions.filter(t => {
    const status = (t.status || '').toLowerCase();
    return status === 'completed' || status === 'terminé' || status === 'termine' || status === 'terminée';
  });
  console.log(`Transactions complétées: ${completedTransactions.length}`);
  if (completedTransactions.length > 0) {
    console.log('Exemple de transaction complétée:', completedTransactions[0]);
  }

  // Vérifier si les statuts sont correctement normalisés
  const problematicTransactions = transactions.filter(t => {
    const status = (t.status || '').toLowerCase();
    return status !== 'pending' && status !== 'completed' && status !== 'cancelled' && 
           status !== 'active' && status !== '' && status !== 'unknown';
  });
  
  if (problematicTransactions.length > 0) {
    console.log(`Transactions avec statuts problématiques: ${problematicTransactions.length}`);
    console.log('Exemples de statuts problématiques:', problematicTransactions.map(t => t.status).slice(0, 5));
  }
  
  // Vérifier la distribution des transactions par mois sur l'année courante
  const currentYear = new Date().getFullYear();
  const monthlyDistribution = Array(12).fill(0);
  
  transactions.forEach(t => {
    try {
      const date = new Date(t.date);
      if (date.getFullYear() === currentYear) {
        monthlyDistribution[date.getMonth()]++;
      }
    } catch (e) {
      // Ignorer les erreurs de parsing de date
    }
  });
  
  console.log('Distribution mensuelle des transactions (année courante):', monthlyDistribution);
}

// Instructions pour utiliser ce script:
// 1. Ajoutez cet appel dans le hook useTransactions juste avant de retourner les transactions
// 2. analyzeTransactions(normalizedTransactions);
// 3. Vérifiez les logs dans la console pour identifier les problèmes

console.log('====== FIN DU SCRIPT DE DÉBOGAGE ======'); 