import { Router } from 'express';
import { db } from '../db';
import { eq, and, gte } from 'drizzle-orm';
import { transactions, properties, tenants, users } from '@shared/schema';
import { addMonths } from 'date-fns';

const router = Router();

// Endpoint pour les paiements récents
router.get('/payments/recent', async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = addMonths(today, -1);

    const recentTransactions = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        date: transactions.date,
        status: transactions.status,
        propertyName: properties.name,
        tenantName: users.fullName,
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .leftJoin(tenants, eq(transactions.tenantId, tenants.id))
      .leftJoin(users, eq(tenants.userId, users.id))
      .where(
        and(
          gte(transactions.date, thirtyDaysAgo),
          eq(transactions.category, 'rent')
        )
      )
      .orderBy(transactions.date);

    const paymentsWithDetails = recentTransactions.map(transaction => {
      let status: 'paid' | 'pending' | 'late';
      const dueDate = new Date(transaction.date);

      if (transaction.status === 'completed') {
        status = 'paid';
      } else if (dueDate > today) {
        status = 'pending';
      } else {
        status = 'late';
      }

      return {
        id: transaction.id.toString(),
        amount: Number(transaction.amount),
        dueDate: transaction.date,
        status,
        tenantName: transaction.tenantName || 'N/A',
        propertyName: transaction.propertyName || 'N/A',
      };
    });

    res.json(paymentsWithDetails);
  } catch (error) {
    console.error('Erreur lors de la récupération des paiements récents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Endpoint pour les statistiques de paiement
router.get('/payments/stats', async (req, res) => {
  try {
    const today = new Date();
    const lastMonth = addMonths(today, -1);
    const twoMonthsAgo = addMonths(today, -2);

    const transactionRecords = await db
      .select({
        amount: transactions.amount,
        date: transactions.date,
        status: transactions.status,
      })
      .from(transactions)
      .where(
        and(
          gte(transactions.date, twoMonthsAgo),
          eq(transactions.category, 'rent')
        )
      );

    const thisMonthTransactions = transactionRecords.filter(t => 
      new Date(t.date) > lastMonth
    );

    const lastMonthTransactions = transactionRecords.filter(t => 
      new Date(t.date) <= lastMonth && new Date(t.date) > twoMonthsAgo
    );

    const calculateOnTimeRate = (transactions: Array<{ status: string; date: Date }>) => {
      if (transactions.length === 0) return 0;
      const onTime = transactions.filter(t => 
        t.status === 'completed' || new Date(t.date) > today
      ).length;
      return (onTime / transactions.length) * 100;
    };

    const thisMonthRate = calculateOnTimeRate(thisMonthTransactions);
    const lastMonthRate = calculateOnTimeRate(lastMonthTransactions);
    const trend = lastMonthRate === 0 ? 0 : ((thisMonthRate - lastMonthRate) / lastMonthRate) * 100;

    const totalDue = thisMonthTransactions.reduce((sum, t) => 
      sum + Number(t.amount), 0);

    const totalPaid = thisMonthTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalLate = thisMonthTransactions
      .filter(t => t.status !== 'completed' && new Date(t.date) < today)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    res.json({
      totalDue,
      totalPaid,
      totalLate,
      onTimeRate: thisMonthRate,
      trend,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;