import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, CreditCard, Wallet, PieChart, Calendar, ArrowUpDown, Clock, AlertCircle, AlertTriangle, Ban, CheckCircle } from "lucide-react";
import { parseISO } from "date-fns";
import type { FormattedTransaction } from "@/types";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface FinanceStatsProps {
  transactions?: FormattedTransaction[];
  activeTab: "pending" | "completed" | "cancelled";
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export function FinanceStats({ transactions = [], activeTab }: FinanceStatsProps) {
  // Filtrer les transactions selon l'onglet actif
  const filteredTransactions = transactions?.filter((t: FormattedTransaction) => {
    try {
      if (t.date) {
        const date = parseISO(t.date);
        if (isNaN(date.getTime())) {
          console.warn("Invalid date found in transaction:", t);
          return false;
        }
      }
      return t.status === activeTab;
    } catch (error) {
      console.error("Error processing transaction:", error);
      return false;
    }
  }) ?? [];

  const stats = filteredTransactions.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount);
      if (isNaN(amount)) {
        console.warn("Invalid amount in transaction:", transaction);
        return acc;
      }

      if (transaction.type === "credit") {
        acc.totalCredit += amount;
        acc.transactionCount.credit++;
      } else if (transaction.type === "income") {
        acc.totalIncome += amount;
        acc.transactionCount.income++;
        
        // Catégoriser les revenus
        if (!acc.categoriesIncome[transaction.category]) {
          acc.categoriesIncome[transaction.category] = 0;
        }
        acc.categoriesIncome[transaction.category] += amount;
        
      } else if (transaction.type === "expense") {
        acc.totalExpenses += amount;
        acc.transactionCount.expense++;
        
        // Catégoriser les dépenses
        if (!acc.categoriesExpense[transaction.category]) {
          acc.categoriesExpense[transaction.category] = 0;
        }
        acc.categoriesExpense[transaction.category] += amount;
      }
      return acc;
    },
    {
      totalIncome: 0,
      totalExpenses: 0,
      totalCredit: 0,
      transactionCount: { income: 0, expense: 0, credit: 0 },
      categoriesIncome: {} as Record<string, number>,
      categoriesExpense: {} as Record<string, number>
    }
  );

  const balance = stats.totalIncome - stats.totalExpenses;
  
  const translateCategory = (category: string): string => {
    const categoryTranslations: Record<string, string> = {
      "rent": "Loyer",
      "maintenance": "Maintenance",
      "insurance": "Assurance",
      "tax": "Taxes",
      "utility": "Charges générales",
      "management_fee": "Frais de gestion",
      "legal_fee": "Frais juridiques",
      "renovation": "Rénovation",
      "mortgage": "Emprunt/Crédit",
      "condominium_fee": "Charges copropriété",
      "security_deposit": "Dépôt de garantie",
      "commission": "Commission",
      "marketing": "Marketing",
      "inspection": "Inspection",
      "cleaning": "Nettoyage",
      "furnishing": "Ameublement",
      "security": "Sécurité",
      "landscaping": "Espaces verts",
      "utilities_water": "Eau",
      "utilities_electricity": "Électricité",
      "utilities_gas": "Gaz",
      "utilities_internet": "Internet/Télécom",
      "accounting": "Comptabilité",
      "consulting": "Conseil",
      "travel": "Déplacement",
      "equipment": "Équipement",
      "refund": "Remboursement",
      "other": "Autre"
    };
    
    return categoryTranslations[category] || category;
  };
  
  const getCategoryColor = (category: string): string => {
    const categoryColors: Record<string, string> = {
      "rent": "bg-blue-500",
      "maintenance": "bg-orange-500",
      "insurance": "bg-purple-500",
      "tax": "bg-red-500",
      "utility": "bg-green-500",
      "management_fee": "bg-indigo-500",
      "legal_fee": "bg-cyan-500",
      "renovation": "bg-amber-500",
      "mortgage": "bg-pink-500",
      "condominium_fee": "bg-teal-500",
      "security_deposit": "bg-sky-500",
      "commission": "bg-lime-500",
      "marketing": "bg-fuchsia-500",
      "inspection": "bg-emerald-500",
      "cleaning": "bg-violet-500",
      "furnishing": "bg-rose-500",
      "security": "bg-stone-500",
      "landscaping": "bg-olive-500",
      "utilities_water": "bg-blue-400",
      "utilities_electricity": "bg-yellow-500",
      "utilities_gas": "bg-orange-400",
      "utilities_internet": "bg-violet-400",
      "accounting": "bg-slate-500",
      "consulting": "bg-zinc-500",
      "travel": "bg-neutral-500",
      "equipment": "bg-stone-400",
      "refund": "bg-emerald-400",
      "other": "bg-gray-500"
    };
    
    return categoryColors[category] || "bg-gray-500";
  };

  // Définir des widgets spécifiques en fonction de l'onglet actif
  let contextWidget;
  let statusDescription;
  let statusColor;

  if (activeTab === "pending") {
    statusDescription = "en attente";
    statusColor = "text-amber-500";
    contextWidget = {
      title: "Échéances à venir",
      icon: Clock,
      color: "text-amber-500",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-amber-500">
              {filteredTransactions.length}
            </span>
            <span className="text-sm text-muted-foreground">
              transactions
            </span>
          </div>
          <div className="space-y-2">
            <Progress 
              value={100} 
              className="h-2 bg-amber-100 dark:bg-amber-950/20"
              indicatorClassName="bg-amber-500"
            />
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Planification financière à suivre
            </div>
          </div>
        </div>
      )
    };
  } else if (activeTab === "completed") {
    statusDescription = "complétées";
    statusColor = "text-emerald-500";
    contextWidget = {
      title: "Performance",
      icon: CheckCircle,
      color: "text-emerald-500",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-emerald-500">
              {stats.totalIncome > stats.totalExpenses ? "+" : ""}
              {balance.toLocaleString()}€
            </span>
            <span className="text-sm text-muted-foreground">
              solde
            </span>
          </div>
          <div className="space-y-2">
            <Progress 
              value={stats.totalIncome > 0 ? (stats.totalIncome / (stats.totalIncome + stats.totalExpenses)) * 100 : 0} 
              className="h-2 bg-emerald-100 dark:bg-emerald-950/20"
              indicatorClassName="bg-emerald-500"
            />
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {stats.totalIncome > stats.totalExpenses ? "Excédent" : "Déficit"} sur la période
            </div>
          </div>
        </div>
      )
    };
  } else { // cancelled
    statusDescription = "annulées";
    statusColor = "text-gray-500";
    contextWidget = {
      title: "Transactions annulées",
      icon: Ban,
      color: "text-gray-500",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-gray-500">
              {filteredTransactions.length}
            </span>
            <span className="text-sm text-muted-foreground">
              annulations
            </span>
          </div>
          <div className="space-y-2">
            <Progress 
              value={100} 
              className="h-2 bg-gray-100 dark:bg-gray-950/20"
              indicatorClassName="bg-gray-500"
            />
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Transactions non finalisées
            </div>
          </div>
        </div>
      )
    };
  }

  const statCards = [
    {
      title: `Crédits ${statusDescription}`,
      icon: CreditCard,
      color: statusColor,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className={`text-3xl font-bold ${statusColor}`}>
              {stats.totalCredit.toLocaleString()}€
            </span>
            <span className="text-sm text-muted-foreground">
              {stats.transactionCount.credit} trans.
            </span>
          </div>
          <div className="space-y-2">
            <div className={`h-2.5 w-full rounded-full bg-${statusColor.replace('text-', '')}/10`}>
              <motion.div 
                className={`h-full ${statusColor.replace('text-', 'bg-')} rounded-full transition-all`}
                initial={{ width: 0 }}
                animate={{ width: `${(stats.totalCredit / Math.max(stats.totalCredit, 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className={`text-xs font-medium ${statusColor}`}>
              {activeTab === "pending" ? "Crédits en attente" : activeTab === "completed" ? "Crédits confirmés" : "Crédits annulés"}
            </div>
          </div>
        </div>
      )
    },
    {
      title: `Dépenses ${statusDescription}`,
      icon: TrendingDown,
      color: statusColor,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className={`text-3xl font-bold ${statusColor}`}>
              {stats.totalExpenses.toLocaleString()}€
            </span>
            <span className="text-sm text-muted-foreground">
              {stats.transactionCount.expense} trans.
            </span>
          </div>
          <div className="space-y-2">
            <Progress 
              value={stats.totalExpenses / Math.max(stats.totalIncome + stats.totalExpenses, 1) * 100} 
              className={`h-2 bg-${statusColor.replace('text-', '')}/10`}
              indicatorClassName={statusColor.replace('text-', 'bg-')}
            />
            <div className={`text-xs font-medium ${statusColor}`}>
              {activeTab === "pending" ? "Dépenses planifiées" : activeTab === "completed" ? "Dépenses effectuées" : "Dépenses annulées"}
            </div>
          </div>
        </div>
      )
    },
    {
      title: `Revenus ${statusDescription}`,
      icon: TrendingUp,
      color: statusColor,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className={`text-3xl font-bold ${statusColor}`}>
              {stats.totalIncome.toLocaleString()}€
            </span>
            <span className="text-sm text-muted-foreground">
              {stats.transactionCount.income} trans.
            </span>
          </div>
          <div className="space-y-2">
            <Progress 
              value={stats.totalIncome / Math.max(stats.totalIncome + stats.totalExpenses, 1) * 100} 
              className={`h-2 bg-${statusColor.replace('text-', '')}/10`}
              indicatorClassName={statusColor.replace('text-', 'bg-')}
            />
            <div className={`text-xs font-medium ${statusColor}`}>
              {activeTab === "pending" ? "Revenus attendus" : activeTab === "completed" ? "Revenus perçus" : "Revenus annulés"}
            </div>
          </div>
        </div>
      )
    },
    contextWidget
  ];

  return (
    <div>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card, index) => (
          <motion.div key={index} variants={item}>
            <Card className="bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-50 dark:from-blue-900/40 dark:via-blue-800/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800/50 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
              <CardContent>
                {card.content}
                </CardContent>
              </Card>
            </motion.div>
        ))}
      </motion.div>
    </div>
  );
}