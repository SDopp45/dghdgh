import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Archive, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  mode: 'delete' | 'archive';
  onConfirm: (transactionAction: 'delete' | 'cancel', purgeHistory?: boolean, deleteDocuments?: boolean) => void;
}

export default function TenantActionDialog({ isOpen, onOpenChange, title, description, mode, onConfirm }: Props) {
  const [transactionAction, setTransactionAction] = useState<'delete' | 'cancel'>('cancel');
  const [purgeHistory, setPurgeHistory] = useState(false);
  const [deleteDocuments, setDeleteDocuments] = useState(false);
  const [isConfirmChecked, setIsConfirmChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = () => {
    setIsDeleting(true);
    onConfirm(transactionAction, purgeHistory, deleteDocuments);
    // Note: setIsDeleting(false) n'est pas nécessaire ici car le composant sera fermé par le parent
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isDeleting && onOpenChange(open)}>
      <AlertDialogContent 
        className={cn(
          "max-w-md bg-gradient-to-br from-background via-background border",
          mode === 'delete' 
            ? "to-red-50 dark:to-red-950/30 border-red-100 dark:border-red-900/50" 
            : "to-amber-50 dark:to-amber-950/30 border-amber-100 dark:border-amber-900/50"
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={cn(
            "text-xl flex items-center gap-2",
            mode === 'delete' 
              ? "text-red-600 dark:text-red-400" 
              : "text-amber-600 dark:text-amber-400"
          )}>
            {mode === 'delete' ? (
              <>
                <Trash2 className="h-5 w-5" />
                Supprimer le bail
              </>
            ) : (
              <>
                <Archive className="h-5 w-5" />
                Archiver le bail
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
            {description}
            
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Que voulez-vous faire des transactions associées ?</label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      className={cn(
                        "text-primary",
                        mode === 'delete' ? "text-red-500 dark:text-red-400" : "text-amber-500 dark:text-amber-400"
                      )}
                      name="transactionAction"
                      value="cancel"
                      checked={transactionAction === 'cancel'}
                      onChange={() => setTransactionAction('cancel')}
                    />
                    <span className="text-sm">Annuler les transactions en attente</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      className={cn(
                        "text-primary",
                        mode === 'delete' ? "text-red-500 dark:text-red-400" : "text-amber-500 dark:text-amber-400"
                      )}
                      name="transactionAction"
                      value="delete"
                      checked={transactionAction === 'delete'}
                      onChange={() => setTransactionAction('delete')}
                    />
                    <span className="text-sm">Supprimer les transactions en attente</span>
                  </label>
                </div>
              </div>

              {mode === 'delete' && (
                <>
                  <div className={cn(
                    "p-3 border rounded-md mb-2",
                    "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/30"
                  )}>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="deleteDocuments" 
                        checked={deleteDocuments} 
                        onCheckedChange={(checked) => setDeleteDocuments(!!checked)}
                        className="border-red-400 dark:border-red-600 text-red-600 dark:text-red-400"
                      />
                      <label 
                        htmlFor="deleteDocuments" 
                        className="text-sm font-medium leading-none text-red-800 dark:text-red-300 cursor-pointer select-none"
                      >
                        Supprimer définitivement tous les documents associés
                      </label>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 border rounded-md",
                    "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/30"
                  )}>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="purgeHistory" 
                        checked={purgeHistory} 
                        onCheckedChange={(checked) => setPurgeHistory(!!checked)}
                        className="border-red-400 dark:border-red-600 text-red-600 dark:text-red-400"
                      />
                      <label 
                        htmlFor="purgeHistory" 
                        className="text-sm font-medium leading-none text-red-800 dark:text-red-300 cursor-pointer select-none"
                      >
                        Supprimer l'historique complet (notes et commentaires)
                      </label>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 border rounded-md",
                    "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/30"
                  )}>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="confirm-delete" 
                        checked={isConfirmChecked} 
                        onCheckedChange={(checked) => setIsConfirmChecked(!!checked)}
                        className="border-red-400 dark:border-red-600 text-red-600 dark:text-red-400"
                      />
                      <label 
                        htmlFor="confirm-delete" 
                        className="text-sm font-medium leading-none text-red-800 dark:text-red-300 cursor-pointer select-none"
                      >
                        Je confirme vouloir supprimer définitivement ce bail
                      </label>
                    </div>
                  </div>
                
                  <p className="text-red-600 dark:text-red-400 font-semibold">
                    Cette action est irréversible et ne peut pas être annulée !
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isDeleting}
            className={cn(
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              mode === 'delete' 
                ? "hover:bg-red-50 dark:hover:bg-red-950/20 border-red-100 dark:border-red-900/30" 
                : "hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-100 dark:border-amber-900/30"
            )}
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting || (mode === 'delete' && !isConfirmChecked)}
            onClick={handleConfirm}
            className={cn(
              "text-white",
              mode === 'delete' ? (
                isConfirmChecked 
                  ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600" 
                  : "bg-red-300 dark:bg-red-800/50 cursor-not-allowed hover:bg-red-300 dark:hover:bg-red-800/50"
              ) : (
                "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
              )
            )}
          >
            {isDeleting ? (
              <div className="flex items-center">
                <span className="mr-2">Traitement en cours</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              mode === 'delete' ? "Supprimer définitivement" : "Archiver"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
