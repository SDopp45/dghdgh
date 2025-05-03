import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";
import { invalidateTransactionsQueries } from "@/hooks/useTransactions";
import { format } from "date-fns";

interface BulkTransactionDialogProps {
  propertyId: number;
  propertyName: string;
  purchasePrice?: number;
  loanAmount?: number;
  loanDuration?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkTransactionDialog({
  propertyId,
  propertyName,
  purchasePrice,
  loanAmount,
  loanDuration,
  open,
  onOpenChange,
}: BulkTransactionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);

  // Préparer les transactions initiales
  const initialTransactions = [];
  
  if (purchasePrice) {
    initialTransactions.push({
      type: "expense" as "expense",
      propertyId,
      category: "purchase" as any,
      amount: purchasePrice,
      description: `Achat de la propriété ${propertyName}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: "bank_transfer" as any,
      status: "completed" as "completed",
    });
  }

  if (loanAmount && loanDuration) {
    const monthlyPayment = loanAmount / (loanDuration * 12);
    const today = new Date();
    
    for (let i = 0; i < loanDuration * 12; i++) {
      const paymentDate = new Date(today);
      paymentDate.setMonth(today.getMonth() + i);
      
      initialTransactions.push({
        type: "credit" as "credit",
        propertyId,
        category: "mortgage" as any,
        amount: monthlyPayment,
        description: `Mensualité de prêt ${i + 1}/${loanDuration * 12} - ${propertyName}`,
        date: format(paymentDate, 'yyyy-MM-dd'),
        paymentMethod: "bank_transfer" as any,
        status: i === 0 ? "completed" as "completed" : "pending" as "pending",
      });
    }
  }

  // Fonction pour gérer la fermeture du dialogue
  const handleDialogClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Invalider toutes les clés de requête liées aux transactions
      invalidateTransactionsQueries(queryClient);
    }
  };

  return (
    <>
      <NewTransactionDialog
        open={open}
        onOpenChange={handleDialogClose}
        initialTransactions={initialTransactions}
      />
    </>
  );
} 